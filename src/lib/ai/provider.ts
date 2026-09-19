import type {
  Angle,
  Brief,
  Candidate,
  ContactResult,
  Email,
  OfferAnalysis,
  Opportunity,
  ResearchReport,
} from "@/lib/schemas";

/**
 * Provider abstraction. The UI and pipeline only ever talk to this interface,
 * so the underlying model can be swapped without touching
 * the rest of the app.
 */
export interface AIProvider {
  readonly name: string;

  analyzeOffer(brief: Brief): Promise<OfferAnalysis>;

  findCandidates(brief: Brief, analysis: OfferAnalysis): Promise<Candidate[]>;

  researchProspect(candidate: Candidate, brief: Brief, analysis: OfferAnalysis): Promise<ResearchReport>;

  findContact(candidate: Candidate, research: ResearchReport): Promise<ContactResult>;

  analyzeOpportunity(
    candidate: Candidate,
    research: ResearchReport,
    brief: Brief,
    analysis: OfferAnalysis
  ): Promise<Opportunity>;

  generateEmail(input: {
    candidate: Candidate;
    research: ResearchReport;
    opportunity: Opportunity;
    angle: Angle;
    brief: Brief;
    previousEmails?: Pick<Email, "subject" | "body" | "angleId">[];
  }): Promise<Omit<Email, "createdAt">>;
}

export class ProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ProviderError";
  }
}
