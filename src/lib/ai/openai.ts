import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import {
  CandidateListSchema,
  ContactResultSchema,
  EmailSchema,
  OfferAnalysisSchema,
  OpportunitySchema,
  ResearchReportSchema,
  SellerProfileSchema,
  type Angle,
  type Brief,
  type Candidate,
  type ContactResult,
  type Email,
  type OfferAnalysis,
  type Opportunity,
  type ResearchReport,
  type SellerProfile,
} from "@/lib/schemas";
import { normalizeWebsite, parseSeeds } from "@/lib/utils";
import { briefBlock, SYSTEM } from "./prompts";
import { openaiApiKey } from "./resolve";
import { ProviderError, type AIProvider } from "./provider";

function pickModel(fallback: string, override?: string) {
  const raw = override?.trim() || "";
  if (raw && !/^claude/i.test(raw)) return raw;
  return fallback;
}

const MODEL = pickModel("gpt-5.5", process.env.LEADLOOP_MODEL);
const RESEARCH_MODEL = pickModel(MODEL, process.env.LEADLOOP_RESEARCH_MODEL);

export class OpenAIProvider implements AIProvider {
  readonly name = `OpenAI · ${MODEL}`;
  private client = new OpenAI({ apiKey: openaiApiKey() });

  private async parse<T extends z.ZodTypeAny>(
    schema: T,
    name: string,
    prompt: string
  ): Promise<z.infer<T>> {
    try {
      const res = await this.client.responses.parse({
        model: MODEL,
        instructions: SYSTEM,
        input: prompt,
        text: { format: zodTextFormat(schema, name) },
      });
      if (!res.output_parsed) throw new ProviderError("The model returned an unreadable response.");
      return schema.parse(res.output_parsed);
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(describeError(err), err);
    }
  }

  private async researchWithWeb(prompt: string): Promise<{ text: string; urls: string[] }> {
    try {
      const res = await this.client.responses.create({
        model: RESEARCH_MODEL,
        instructions: SYSTEM,
        input: prompt,
        tools: [{ type: "web_search" }],
        include: ["web_search_call.action.sources"],
      });
      const text = (res.output_text ?? "").trim();
      if (!text) throw new ProviderError("The model returned an empty research response.");
      return { text, urls: collectUrls(res) };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(describeError(err), err);
    }
  }

  async analyzeSellerWebsite(website: string, notes?: { offer?: string; icp?: string }): Promise<SellerProfile> {
    const url = normalizeWebsite(website);
    if (!url) throw new ProviderError("Enter a valid website, like https://yourcompany.com.");
    const note = [notes?.offer && `The seller already described the offer as: ${notes.offer}`, notes?.icp && `They already described the ideal customer as: ${notes.icp}`]
      .filter(Boolean)
      .join("\n");
    const { text, urls } = await this.researchWithWeb(
      `This website belongs to the SELLER, not a prospect. Read it and learn what they provide and how they talk, so outreach can match them.

WEBSITE: ${url}

Look at the homepage, services/products, about, and any case studies or industries served. Quote what you actually saw.

${note ? `USER NOTES (these override inferences from the site):\n${note}` : "The user has not described the offer yet. Infer it only from the site."}

Report:
- Company name
- What they sell
- Who they sell to (from services, case studies, markets — not a profile of the seller)
- Named services
- Proof (clients, industries, results) if present
- How the site sounds (tone and voice)
- How a first email from them should sound, a specific CTA, and what not to claim`
    );
    return this.parse(
      SellerProfileSchema,
      "seller_profile",
      `Convert these notes about the SELLER's website into the required structure. The website field must be "${url}". Offer and ICP are about what they sell and who they should find as customers. If the user notes above conflict with the site, prefer the user notes. Do not invent services or proof that are not in the notes.\n\nNOTES:\n${text}\n\nURLS SEEN:\n${urls.join("\n")}`
    );
  }

  async analyzeOffer(brief: Brief): Promise<OfferAnalysis> {
    return this.parse(
      OfferAnalysisSchema,
      "offer_analysis",
      `Analyze this sales brief and describe the ideal prospect profile.\n\n${briefBlock(brief)}\n\nBe specific and practical. Keep each list to 3-6 items.`
    );
  }

  async findCandidates(brief: Brief, analysis: OfferAnalysis): Promise<Candidate[]> {
    const seeds = parseSeeds(brief.seeds);
    const prompt = seeds.length
      ? `Identify these specific companies and confirm they exist. Use web search. Fill in homepage, industry, city/country and a one-line description. Skip anything you cannot confirm.

SEED LIST:
${seeds.map((s) => `- ${s}`).join("\n")}

${briefBlock(brief)}

Keep at most ${Math.min(brief.count, seeds.length)} companies. Only list companies named in the seed list.`
      : `Find ${brief.count} real companies that match this prospect profile. Use web search efficiently: a few well-chosen searches (directories, "best of" lists, association member lists, LinkedIn company pages) rather than one search per company.

${briefBlock(brief)}

PROSPECT PROFILE:
Industries: ${analysis.targetIndustries.join(", ")}
Characteristics: ${analysis.companyCharacteristics.join("; ")}

Match the size and type described in the ideal customer as closely as you can. Skip solo practitioners or tiny shops if the ICP asks for larger companies, and skip large enterprises if it asks for small ones. Prefer companies whose own website you can name.

For each company, note: name, homepage URL, industry, city/country, a one-line description, and the URL where you found it. Only list companies you actually found in search results.`;

    const { text, urls } = await this.researchWithWeb(prompt);
    const parsed = await this.parse(
      CandidateListSchema,
      "candidate_list",
      `Extract the companies from these research notes into the required structure. Only include companies that are named in the notes. Do not add any. Keep at most ${brief.count}.\n\nNOTES:\n${text}\n\nURLS SEEN:\n${urls.join("\n")}`
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

Report what you actually observed, with the URL for each observation. Focus on what matters for deciding whether and why to contact them: website and customer journey, services, size, hiring, recent changes. Skip trivia such as addresses, phone numbers and biographies. Separate what you saw from what you infer. If you could not find enough, say so. Keep it under 400 words.`
    );
    return this.parse(
      ResearchReportSchema,
      "research_report",
      `Convert these research notes into the required structure. Keep 5-8 evidence items: the most decision-relevant observations only, no contact details or biography. Every evidence item marked "verified" must have a source URL from the list below. Anything without a URL must be "inferred", "potential" or "unknown". Set researchStatus to "insufficient" if very little was found.\n\nNOTES:\n${text}\n\nURLS SEEN:\n${urls.join("\n")}`
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
- Stop after 4 searches at most. Keep the answer under 150 words.`
    );
    return this.parse(
      ContactResultSchema,
      "contact_result",
      `Extract contacts from these notes. Any email not quoted verbatim in the notes must be marked "inferred" — and prefer to leave it out. Keep at most 4, best first (named person with verified email > generic verified inbox > name without email).\n\nNOTES:\n${text}\n\nURLS SEEN:\n${urls.join("\n")}`
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
      "opportunity",
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
      "email",
      `Write a first-touch outreach email.

SENDER SELLS: ${brief.offer}
${brief.seller ? `SENDER COMPANY: ${brief.seller.companyName || "Unknown"} (${brief.seller.website})
SERVICES THEY ACTUALLY OFFER: ${brief.seller.services.join("; ") || brief.seller.offer}
HOW THEY PITCH: ${brief.seller.outreach.pitch}
TONE TO MATCH: ${brief.seller.outreach.tone}
VOICE: ${brief.seller.outreach.voice}
PREFERRED CTA: ${brief.seller.outreach.cta}
DO NOT: ${brief.seller.outreach.avoid}` : ""}
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
- One clear problem or opportunity. One simple, low-commitment CTA${brief.seller?.outreach.cta ? ` — prefer: ${brief.seller.outreach.cta}` : ` (e.g. "Would it be useful if I sent it over?")`}.
- No fake familiarity, no hype, no claims the sender cannot know.
- Only mention services the sender actually offers${brief.seller ? " (from the seller website review)" : ""}.
- Match the sender's voice. Do not sound like a generic agency.
- Sign off with a placeholder "[Your name]"${brief.seller?.companyName ? `, then ${brief.seller.companyName}` : ""}.
Set angleId to "${angle.id}" and angleTitle to "${angle.title}".`
    );
    return { ...result, angleId: angle.id, angleTitle: angle.title };
  }
}

function collectUrls(res: OpenAI.Responses.Response): string[] {
  const urls = new Set<string>();
  for (const item of res.output ?? []) {
    if (item.type === "web_search_call") {
      const sources = "action" in item ? (item.action as { sources?: { url?: string }[] } | undefined)?.sources : undefined;
      if (sources) for (const source of sources) if (source.url) urls.add(source.url);
    }
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text") {
          for (const annotation of part.annotations ?? []) {
            if (annotation.type === "url_citation" && annotation.url) urls.add(annotation.url);
          }
        }
      }
    }
  }
  return [...urls];
}

function apiMessage(err: { error?: unknown; message?: string }): string {
  const nested = err.error as { message?: string; code?: string } | undefined;
  return (nested?.message ?? err.message ?? "").slice(0, 200);
}

function describeError(err: unknown): string {
  if (err instanceof OpenAI.AuthenticationError) return "The OpenAI API key was rejected.";
  if (err instanceof OpenAI.RateLimitError) return "OpenAI is rate limiting requests. Try again in a moment.";
  if (err instanceof OpenAI.APIConnectionError) return "Could not reach OpenAI.";
  if (err instanceof OpenAI.BadRequestError) return `OpenAI rejected the request: ${apiMessage(err)}`;
  if (err instanceof OpenAI.APIError) {
    const msg = apiMessage(err);
    if (/quota|billing|insufficient/i.test(msg)) return "OpenAI credit is too low. Add billing or try again later.";
    return msg ? `OpenAI error: ${msg}` : `OpenAI error (${err.status ?? "unknown"}).`;
  }
  return "Research unavailable. Try again.";
}
