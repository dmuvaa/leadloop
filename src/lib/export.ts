import type { Prospect } from "@/lib/schemas";
import { csvCell, domainOf, hostOf } from "@/lib/utils";
import { prospectStatus } from "@/lib/schemas";

const HEADER = [
  "company_name",
  "website",
  "domain",
  "industry",
  "location",
  "status",
  "icp_fit",
  "opportunity_score",
  "why_fit",
  "opportunity",
  "signal",
  "why_now",
  "why_now_status",
  "recommended_angle",
  "contact_name",
  "contact_email",
  "evidence_claims",
  "evidence_sources",
  "evidence_status",
  "notes",
];

export function buildProspectCsv(prospects: Prospect[]) {
  const rows = prospects.map((p) => {
    const evidence = p.research.evidence.slice(0, 5);
    return [
      p.company.name,
      p.company.website,
      domainOf(p.company.website) || hostOf(p.company.website),
      p.company.industry,
      p.company.location,
      prospectStatus(p),
      p.opportunity.icpFit,
      p.opportunity.opportunityScore,
      p.opportunity.whyFit,
      p.opportunity.opportunity,
      p.opportunity.signal,
      p.opportunity.whyNow.text,
      p.opportunity.whyNow.status,
      p.opportunity.recommendedAngle.title,
      p.recipient?.name ?? "",
      p.recipient?.email ?? "",
      evidence.map((e) => e.claim).join(" | "),
      evidence.map((e) => e.source).filter(Boolean).join(" | "),
      evidence.map((e) => e.status).join(" | "),
      p.notes ?? "",
    ]
      .map(csvCell)
      .join(",");
  });
  return [HEADER.join(","), ...rows].join("\n");
}
