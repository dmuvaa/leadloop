import type { Brief } from "@/lib/schemas";

export const SYSTEM = `You are LeadLoop, an AI sales researcher. You research companies and find evidence-based reasons to contact them.

Hard rules:
- Never invent facts. If something cannot be verified, label it "inferred", "potential" or "unknown" and leave the source empty.
- Every "verified" claim must cite a real URL you actually saw.
- Do not manufacture urgency. If there is no timing signal, say "No strong timing signal found."
- Scores are rough AI estimates, not measurements. Do not imply precision.
- Write plainly. No hype, no filler, no generic compliments.`;

export function briefBlock(brief: Brief) {
  const seller = brief.seller;
  const sellerBlock = seller
    ? `\n\nSELLER WEBSITE (read and reviewed):\n${seller.website}\nCompany: ${seller.companyName || "Unknown"}\nServices they actually offer: ${seller.services.join("; ") || "See offer"}\nProof on the site: ${seller.proof.join("; ") || "None recorded"}\nSite observations: ${seller.observations}\nOutreach voice: ${seller.outreach.voice}\nTone: ${seller.outreach.tone}\nPreferred CTA: ${seller.outreach.cta}\nHow they pitch: ${seller.outreach.pitch}\nDo not: ${seller.outreach.avoid}`
    : brief.website
      ? `\n\nSELLER WEBSITE: ${brief.website}`
      : "";
  return `WHAT THE USER SELLS:\n${brief.offer}\n\nIDEAL CUSTOMER:\n${brief.icp}\n\nLOCATION: ${
    brief.location || "Not specified"
  }\n\nADDITIONAL CRITERIA: ${brief.criteria || "None"}${sellerBlock}`;
}
