import { z } from "zod";

/* ---------- User brief ---------- */

export const SellerOutreachSchema = z.object({
  tone: z.string().describe("How the seller sounds on their site, and how emails should sound. e.g. Direct, practical, no jargon."),
  voice: z.string().describe("One sentence on the writing voice to match."),
  cta: z.string().describe("The low-commitment ask they should use."),
  pitch: z.string().describe("How they describe the offer in a first email, grounded in services on the site."),
  avoid: z.string().describe("What not to claim or lead with, given what the site actually says."),
});
export type SellerOutreach = z.infer<typeof SellerOutreachSchema>;

export const SellerProfileSchema = z.object({
  website: z.string(),
  companyName: z.string().describe("Seller company name from the site, or empty if unclear."),
  offer: z.string().describe("What they sell, in one or two sentences, from the site."),
  icp: z.string().describe("Who they sell to, inferred from services, case studies and markets on the site."),
  services: z.array(z.string()).describe("Concrete services or products named on the site. 3-8 items."),
  proof: z.array(z.string()).describe("Case studies, industries served, or other proof on the site. Empty if none."),
  observations: z.string().describe("What was actually seen on the site. Two or three sentences."),
  outreach: SellerOutreachSchema,
  confidence: z.enum(["high", "medium", "low"]),
});
export type SellerProfile = z.infer<typeof SellerProfileSchema>;

export const BriefSchema = z.object({
  offer: z.string().min(10, "Tell us a bit more about what you sell."),
  icp: z.string().min(10, "Describe who you want to sell to."),
  location: z.string().optional().default(""),
  count: z.union([z.literal(5), z.literal(10), z.literal(25)]).default(10),
  criteria: z.string().optional().default(""),
  /** The seller's own website. Read to learn what they provide and how outreach should sound. */
  website: z.string().optional().default(""),
  seller: SellerProfileSchema.optional(),
  /** Names, domains or a small CSV of companies to research instead of discovering new ones. */
  seeds: z.string().optional().default(""),
  /** Domains to drop from discovery (suppression list). */
  excludeDomains: z.array(z.string()).optional().default([]),
});
export type Brief = z.infer<typeof BriefSchema>;

/* ---------- Stage A: offer analysis ---------- */

export const OfferAnalysisSchema = z.object({
  offerSummary: z.string().describe("One sentence restating what the user sells, in plain language."),
  targetIndustries: z.array(z.string()).describe("Industries most likely to buy."),
  companyCharacteristics: z.array(z.string()).describe("Size, stage, business model traits of a good-fit company."),
  painPoints: z.array(z.string()).describe("Concrete problems this offer solves."),
  buyingSignals: z.array(z.string()).describe("Observable signals that a company may need this now."),
  qualificationCriteria: z.array(z.string()).describe("Yes/no checks for ICP fit."),
  researchSignals: z.array(z.string()).describe("What to look for on a company's website or public footprint."),
});
export type OfferAnalysis = z.infer<typeof OfferAnalysisSchema>;

/* ---------- Stage B: candidates + research ---------- */

export const CandidateSchema = z.object({
  name: z.string(),
  website: z.string().describe("Homepage URL, or empty string if unknown."),
  industry: z.string(),
  location: z.string(),
  description: z.string().describe("One or two sentences on what the company does."),
  sourceUrl: z.string().describe("Where this company was found. Empty string if none."),
});
export type Candidate = z.infer<typeof CandidateSchema>;

export const CandidateListSchema = z.object({ companies: z.array(CandidateSchema) });

export const EvidenceStatus = z.enum(["verified", "inferred", "potential", "unknown"]);
export type EvidenceStatus = z.infer<typeof EvidenceStatus>;

export const EvidenceSchema = z.object({
  claim: z.string().describe("A single specific observation."),
  source: z.string().describe("URL that supports the claim, or empty string if not verified."),
  confidence: z.enum(["high", "medium", "low"]),
  status: EvidenceStatus.describe(
    "verified = directly observed at the source; inferred = reasonable conclusion from observations; potential = plausible but unconfirmed; unknown = could not determine."
  ),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const ResearchReportSchema = z.object({
  description: z.string(),
  productsServices: z.array(z.string()),
  targetCustomers: z.string(),
  websiteObservations: z.array(z.string()).describe("What the website does well or poorly, from actually looking at it."),
  hiringSignals: z.array(z.string()).describe("Open roles or growth signals. Empty if none found."),
  publicSignals: z.array(z.string()).describe("News, expansions, launches, funding. Empty if none found."),
  evidence: z.array(EvidenceSchema),
  researchStatus: z.enum(["complete", "partial", "insufficient"]),
});
export type ResearchReport = z.infer<typeof ResearchReportSchema>;

/* ---------- Stage B3: contact discovery ---------- */

export const ContactSchema = z.object({
  email: z.string().describe("An email address that appears verbatim on a public page. Empty string if only a name/role was found."),
  name: z.string().describe("Person's name if known, else empty string."),
  role: z.string().describe("Title or role, e.g. Owner, Managing Partner, Office Manager. Empty if unknown."),
  source: z.string().describe("URL where this contact detail was seen."),
  status: z.enum(["verified", "inferred"]).describe("verified = email seen on the page at source; inferred = a likely address that was NOT seen verbatim."),
  kind: z.enum(["person", "generic"]).describe("person = a named individual; generic = info@, contact@, office@ etc."),
});
export type Contact = z.infer<typeof ContactSchema>;

export const ContactResultSchema = z.object({
  contacts: z.array(ContactSchema).describe("Best first. At most 4."),
  note: z.string().describe("One sentence on what was and wasn't found."),
});
export type ContactResult = z.infer<typeof ContactResultSchema>;

/* ---------- Stage C: opportunity analysis ---------- */

export const AngleSchema = z.object({
  id: z.string().describe("Short kebab-case id, e.g. website-conversion."),
  title: z.string().describe("Three to five words, e.g. Website conversion."),
  summary: z.string().describe("One sentence: what the salesperson should talk about."),
  rationale: z.string().describe("Why this angle makes sense for this company, grounded in evidence."),
});
export type Angle = z.infer<typeof AngleSchema>;

export const OpportunitySchema = z.object({
  icpFit: z.number().min(0).max(100),
  opportunityScore: z.number().min(0).max(100),
  breakdown: z.object({
    icpFit: z.number().min(0).max(100),
    problemRelevance: z.number().min(0).max(100),
    timing: z.number().min(0).max(100),
    evidenceConfidence: z.number().min(0).max(100),
  }),
  whyFit: z.string().describe("Two or three sentences explaining the ICP match."),
  opportunity: z.string().describe("The specific, evidence-backed problem or unmet need."),
  signal: z.string().describe("One sentence: the single strongest observation. Shown on the card."),
  whyNow: z.object({
    text: z.string().describe("The timing signal, or 'No strong timing signal found.'"),
    status: EvidenceStatus,
  }),
  recommendedAngle: AngleSchema,
  alternativeAngles: z.array(AngleSchema).describe("Two or three materially different angles."),
  outreachAdvice: z.string().describe("One or two sentences: what NOT to pitch, and what to open with instead."),
});
export type Opportunity = z.infer<typeof OpportunitySchema>;

/* ---------- Stage D: email ---------- */

export const EmailSchema = z.object({
  subject: z.string(),
  body: z.string().describe("60-120 words. Plain text. No fake familiarity."),
  angleId: z.string(),
  angleTitle: z.string(),
  rationale: z.string().describe("One sentence on why this angle and opening were chosen."),
});
export type Email = z.infer<typeof EmailSchema> & { createdAt: string };

/* ---------- Review / workspace records (stored client-side) ---------- */

export const PROSPECT_STATUSES = ["inbox", "kept", "skipped", "queued", "sent"] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export type Prospect = {
  id: string;
  searchId: string;
  createdAt: string;
  company: Candidate;
  research: ResearchReport;
  opportunity: Opportunity;
  emails: Email[];
  saved: boolean;
  inQueue: boolean;
  queueAngleId?: string;
  /** Contacts found on public pages during research. */
  contacts?: ContactResult;
  /** Who the outreach goes to. Auto-filled only from a verified contact; otherwise entered by the user. */
  recipient?: { email: string; name?: string };
  /** Human approval gate. Only approved emails can be sent. */
  approved?: boolean;
  sent?: { at: string; subject: string; angleId: string; to: string; messageId?: string };
  /** Inbox review state. Derived for older records. */
  status?: ProspectStatus;
  notes?: string;
  listIds?: string[];
};

export type Search = {
  id: string;
  brief: Brief;
  analysis: OfferAnalysis;
  createdAt: string;
  prospectIds: string[];
};

export type SavedBrief = {
  id: string;
  name: string;
  brief: Brief;
  createdAt: string;
};

export type ProspectList = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  prospectIds: string[];
};

export type Campaign = {
  id: string;
  name: string;
  objective: string;
  createdAt: string;
  prospectIds: string[];
  listId?: string;
  searchId?: string;
};

export type Suppression = {
  id: string;
  email?: string;
  domain?: string;
  reason?: string;
  createdAt: string;
};

export type WorkspaceSettings = {
  name: string;
  companyName: string;
  website: string;
};

export function prospectStatus(p: Prospect): ProspectStatus {
  if (p.sent) return "sent";
  if (p.status === "skipped") return "skipped";
  if (p.inQueue) return "queued";
  if (p.status === "kept") return "kept";
  if (p.saved) return "kept";
  return p.status ?? "inbox";
}

export const STATUS_LABEL: Record<ProspectStatus, string> = {
  inbox: "To review",
  kept: "Kept",
  skipped: "Skipped",
  queued: "Queued",
  sent: "Sent",
};

/* ---------- Streaming pipeline events ---------- */

export const STAGES = [
  { id: "offer", label: "Understanding your offer" },
  { id: "find", label: "Finding matching companies" },
  { id: "research", label: "Researching leads" },
  { id: "opportunity", label: "Qualifying each lead" },
  { id: "angles", label: "Preparing outreach" },
  { id: "contacts", label: "Finding contacts" },
] as const;
export type StageId = (typeof STAGES)[number]["id"];
export type StageStatus = "waiting" | "active" | "done" | "error";

export type PipelineEvent =
  | { type: "meta"; searchId: string; providerName: string }
  | { type: "stage"; stage: StageId; status: StageStatus; detail?: string }
  | { type: "analysis"; analysis: OfferAnalysis }
  | { type: "candidates"; candidates: Candidate[] }
  | { type: "prospect"; prospect: Prospect }
  | { type: "prospect_failed"; name: string; reason: string }
  | { type: "done"; total: number }
  | { type: "error"; message: string };
