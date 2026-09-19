import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import {
  CandidateListSchema,
  ContactResultSchema,
  EmailSchema,
  OfferAnalysisSchema,
  OpportunitySchema,
  ResearchReportSchema,
  type Angle,
  type Brief,
  type Candidate,
  type ContactResult,
  type Email,
  type OfferAnalysis,
  type Opportunity,
  type ResearchReport,
} from "@/lib/schemas";
import { ProviderError, type AIProvider } from "./provider";

const MODEL = process.env.LEADLOOP_MODEL ?? "claude-fable-5-1";
const RESEARCH_MODEL = process.env.LEADLOOP_RESEARCH_MODEL ?? MODEL;

/**
 * Claude Fable 5.1 runs safety classifiers that can decline a request with
 * stop_reason "refusal". Server-side fallbacks re-run such requests on a
 * default fallback model inside the same call, so research keeps flowing.
 */
const BETAS = ["server-side-fallback-2026-07-01"];
const FALLBACKS = "default" as const;

const SYSTEM = `You are LeadLoop, an AI sales researcher. You research companies and find evidence-based reasons to contact them.

Hard rules:
- Never invent facts. If something cannot be verified, label it "inferred", "potential" or "unknown" and leave the source empty.
- Every "verified" claim must cite a real URL you actually saw.
- Do not manufacture urgency. If there is no timing signal, say "No strong timing signal found."
- Scores are rough AI estimates, not measurements. Do not imply precision.
- Write plainly. No hype, no filler, no generic compliments.`;

function briefBlock(brief: Brief) {
  return `WHAT THE USER SELLS:\n${brief.offer}\n\nIDEAL CUSTOMER:\n${brief.icp}\n\nLOCATION: ${
    brief.location || "Not specified"
  }\n\nADDITIONAL CRITERIA: ${brief.criteria || "None"}`;
}

export class AnthropicProvider implements AIProvider {
  readonly name = `Claude · ${MODEL}`;
  private client = new Anthropic({
    // Keys that are not scoped to a workspace must send the workspace id explicitly.
    defaultHeaders: process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } : undefined,
  });

  /** Structured call without tools. */
  private async parse<T extends z.ZodTypeAny>(
    schema: T,
    prompt: string,
    effort: "low" | "medium" | "high" = "medium",
    maxTokens = 8000
  ): Promise<z.infer<T>> {
    try {
      const res = await this.client.beta.messages.parse({
        model: MODEL,
        max_tokens: maxTokens,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: betaZodOutputFormat(schema), effort },
        betas: BETAS,
        fallbacks: FALLBACKS,
      });
      if (res.stop_reason === "refusal") throw new ProviderError("The model declined this request.");
      if (!res.parsed_output) throw new ProviderError("The model returned an unreadable response.");
      return res.parsed_output;
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(describeError(err), err);
    }
  }

  /**
   * Research call: lets the model use web search, handles pause_turn, and
   * returns the final free-text findings plus every URL it visited.
   */
  private async researchWithWeb(prompt: string, maxUses: number): Promise<{ text: string; urls: string[] }> {
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
    const urls = new Set<string>();
    let text = "";
    try {
      for (let i = 0; i < 4; i++) {
        const res = await this.client.beta.messages.create({
          model: RESEARCH_MODEL,
          max_tokens: 12000,
          system: SYSTEM,
          messages,
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: maxUses }],
          output_config: { effort: "medium" },
          betas: BETAS,
          fallbacks: FALLBACKS,
        });
        for (const block of res.content) {
          if (block.type === "text") text += block.text + "\n";
          if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
            for (const r of block.content) if (r.type === "web_search_result") urls.add(r.url);
          }
        }
        if (res.stop_reason === "pause_turn") {
          messages.push({ role: "assistant", content: res.content });
          continue;
        }
        if (res.stop_reason === "refusal") throw new ProviderError("The model declined this request.");
        break;
      }
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(describeError(err), err);
    }
    return { text: text.trim(), urls: [...urls] };
  }

  async analyzeOffer(brief: Brief): Promise<OfferAnalysis> {
    return this.parse(
      OfferAnalysisSchema,
      `Analyze this sales brief and describe the ideal prospect profile.\n\n${briefBlock(brief)}\n\nBe specific and practical. Keep each list to 3-6 items.`
    );
  }

  async findCandidates(brief: Brief, analysis: OfferAnalysis): Promise<Candidate[]> {
    const { text, urls } = await this.researchWithWeb(
      `Find ${brief.count} real companies that match this prospect profile. Use web search efficiently: a few well-chosen searches (directories, "best of" lists, association member lists, LinkedIn company pages) rather than one search per company.

${briefBlock(brief)}

PROSPECT PROFILE:
Industries: ${analysis.targetIndustries.join(", ")}
Characteristics: ${analysis.companyCharacteristics.join("; ")}

Match the size and type described in the ideal customer as closely as you can. Skip solo practitioners or tiny shops if the ICP asks for larger companies, and skip large enterprises if it asks for small ones. Prefer companies whose own website you can name.

For each company, note: name, homepage URL, industry, city/country, a one-line description, and the URL where you found it. Only list companies you actually found in search results.`,
      8
    );
    const parsed = await this.parse(
      CandidateListSchema,
      `Extract the companies from these research notes into the required structure. Only include companies that are named in the notes. Do not add any. Keep at most ${brief.count}.\n\nNOTES:\n${text}\n\nURLS SEEN:\n${urls.join("\n")}`,
      "low"
    );
    return parsed.companies.slice(0, brief.count);
  }

  async researchProspect(candidate: Candidate, brief: Brief, analysis: OfferAnalysis): Promise<ResearchReport> {
    const { text, urls } = await this.researchWithWeb(
      `Research this company so a salesperson can decide whether and why to contact them. Use web search. Look at their website if possible.

COMPANY: ${candidate.name}
WEBSITE: ${candidate.website || "unknown"}
INDUSTRY: ${candidate.industry}
LOCATION: ${candidate.location}

The salesperson sells: ${analysis.offerSummary}
Look specifically for: ${analysis.researchSignals.join("; ")}
Relevant buying signals: ${analysis.buyingSignals.join("; ")}

Report what you actually observed, with the URL for each observation. Focus on what matters for deciding whether and why to contact them: website and customer journey, services, size, hiring, recent changes. Skip trivia such as addresses, phone numbers and biographies. Separate what you saw from what you infer. If you could not find enough, say so. Keep it under 400 words.`,
      5
    );
    return this.parse(
      ResearchReportSchema,
      `Convert these research notes into the required structure. Keep 5-8 evidence items: the most decision-relevant observations only, no contact details or biography. Every evidence item marked "verified" must have a source URL from the list below. Anything without a URL must be "inferred", "potential" or "unknown". Set researchStatus to "insufficient" if very little was found.\n\nNOTES:\n${text}\n\nURLS SEEN:\n${urls.join("\n")}`,
      "low"
    );
  }

  async findContact(candidate: Candidate, research: ResearchReport): Promise<ContactResult> {
    const site = candidate.website || "";
    const { text, urls } = await this.researchWithWeb(
      `Find who to email at this company and their public email address. Use web search: the company's own contact, about and team pages first (${site || "website unknown"}), then LinkedIn or directories for the owner / managing partner / office manager.

COMPANY: ${candidate.name} (${candidate.industry}, ${candidate.location})
KNOWN: ${research.description}

Rules:
- Only report an email address if you saw it written on a page. Quote the page URL.
- Do not construct addresses from name patterns. If you only find a name and role, report that with an empty email.
- Prefer a named decision-maker over a generic inbox, but include the generic inbox (info@, contact@) too if it is published.
- Stop after 4 searches at most. Keep the answer under 150 words.`,
      4
    );
    return this.parse(
      ContactResultSchema,
      `Extract contacts from these notes. Any email not quoted verbatim in the notes must be marked "inferred" — and prefer to leave it out. Keep at most 4, best first (named person with verified email > generic verified inbox > name without email).\n\nNOTES:\n${text}\n\nURLS SEEN:\n${urls.join("\n")}`,
      "low"
    );
  }

  async analyzeOpportunity(
    candidate: Candidate,
    research: ResearchReport,
    brief: Brief,
    analysis: OfferAnalysis
  ): Promise<Opportunity> {
    return this.parse(
      OpportunitySchema,
      `Decide whether and why this company is worth contacting.

${briefBlock(brief)}

PROSPECT PROFILE:
Pain points solved: ${analysis.painPoints.join("; ")}
Qualification criteria: ${analysis.qualificationCriteria.join("; ")}

COMPANY: ${candidate.name} (${candidate.industry}, ${candidate.location})
RESEARCH:
${JSON.stringify(research, null, 2)}

Guidance:
- icpFit: how closely they match the ideal customer.
- opportunityScore: overall, considering fit, problem relevance, timing and evidence confidence. Round to the nearest 5; these are rough estimates.
- whyNow: only cite a timing signal that appears in the research. Otherwise write "No strong timing signal found." with status "unknown".
- recommendedAngle + 2-3 alternativeAngles must be materially different (e.g. conversion, SEO/visibility, automation, customer experience, expansion support).
- outreachAdvice: tell the salesperson what not to lead with and what to open with instead.`
    );
  }

  async generateEmail(input: {
    candidate: Candidate;
    research: ResearchReport;
    opportunity: Opportunity;
    angle: Angle;
    brief: Brief;
    previousEmails?: Pick<Email, "subject" | "body" | "angleId">[];
  }): Promise<Omit<Email, "createdAt">> {
    const { candidate, research, opportunity, angle, brief, previousEmails = [] } = input;
    const verified = research.evidence.filter((e) => e.status === "verified");
    const result = await this.parse(
      EmailSchema,
      `Write a first-touch outreach email.

SENDER SELLS: ${brief.offer}
TO: someone senior at ${candidate.name} (${candidate.industry}, ${candidate.location}). Use "Hi there," if no name is known. Never invent a name.

ANGLE: ${angle.title} — ${angle.summary}
Why this angle: ${angle.rationale}

OPPORTUNITY: ${opportunity.opportunity}
STRONGEST SIGNAL: ${opportunity.signal}
VERIFIED OBSERVATIONS (safe to mention):
${verified.length ? verified.map((e) => `- ${e.claim}`).join("\n") : "- None verified. Speak in terms of what businesses like theirs typically face; do not claim to have seen anything specific."}
UNVERIFIED (do NOT state as fact): ${research.evidence
        .filter((e) => e.status !== "verified")
        .map((e) => e.claim)
        .join("; ") || "none"}

${previousEmails.length ? `EARLIER DRAFTS (write something materially different):\n${previousEmails.map((e) => `[${e.angleId}] ${e.subject}\n${e.body}`).join("\n\n")}` : ""}

Rules:
- 60-120 words. Plain text. Short paragraphs.
- Open with one specific observation, not a compliment. Never "I hope you're doing well" or "I came across your amazing company".
- One clear problem or opportunity. One simple, low-commitment CTA (e.g. "Would it be useful if I sent it over?").
- No fake familiarity, no hype, no claims the sender cannot know.
- Sign off with a placeholder "[Your name]".
Set angleId to "${angle.id}" and angleTitle to "${angle.title}".`
    );
    return { ...result, angleId: angle.id, angleTitle: angle.title };
  }
}

function apiMessage(err: { error?: unknown; message?: string }): string {
  const e = err.error as { error?: { message?: string } } | undefined;
  return (e?.error?.message ?? err.message ?? "").slice(0, 200);
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "The AI provider rejected the API key.";
  if (err instanceof Anthropic.RateLimitError) return "The AI provider is rate limiting requests. Try again in a moment.";
  if (err instanceof Anthropic.APIConnectionError) return "Could not reach the AI provider.";
  if (err instanceof Anthropic.BadRequestError) {
    const msg = apiMessage(err);
    if (/workspace/i.test(msg)) return "This API key needs a workspace. Set ANTHROPIC_WORKSPACE_ID in .env.local and restart.";
    return `The AI provider rejected the request: ${msg}`;
  }
  if (err instanceof Anthropic.APIError) return `AI provider error (${err.status ?? "unknown"}).`;
  return "Research unavailable. Try again.";
}
