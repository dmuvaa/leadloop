import type { AIProvider } from "@/lib/ai/provider";
import type { Brief, Candidate, PipelineEvent, Prospect } from "@/lib/schemas";
import { newId } from "@/lib/utils";

/**
 * Runs the agentic pipeline:
 *   Brief → ICP Analyst → Prospect Researcher → Opportunity Analyst → Outreach Strategist
 * and emits typed progress events as each stage / prospect completes.
 */
/** Auto-fill the recipient only from a verified, published address. Named person beats generic inbox. */
export function pickRecipient(result: Prospect["contacts"]): Prospect["recipient"] {
  const verified = result?.contacts.filter((c) => c.email && c.status === "verified") ?? [];
  // Named person > generic inbox > nameless "person" address (usually HR or a stray mailbox).
  const best =
    verified.find((c) => c.kind === "person" && c.name) ?? verified.find((c) => c.kind === "generic") ?? verified[0];
  return best ? { email: best.email, name: best.name || undefined } : undefined;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export async function runPipeline(
  provider: AIProvider,
  brief: Brief,
  emit: (e: PipelineEvent) => void,
  signal?: AbortSignal
) {
  const searchId = newId("srch");
  emit({ type: "meta", searchId, providerName: provider.name });

  // Stage A — understand the offer
  emit({ type: "stage", stage: "offer", status: "active" });
  const analysis = await provider.analyzeOffer(brief);
  emit({ type: "analysis", analysis });
  emit({ type: "stage", stage: "offer", status: "done", detail: truncate(analysis.targetIndustries.slice(0, 3).join(", "), 70) });
  if (signal?.aborted) return;

  // Stage B1 — find candidates
  emit({ type: "stage", stage: "find", status: "active" });
  const candidates = await provider.findCandidates(brief, analysis);
  if (candidates.length === 0) {
    emit({ type: "stage", stage: "find", status: "error", detail: "No matching companies found." });
    emit({ type: "error", message: "We couldn't find companies matching that profile. Try broadening the ideal customer." });
    return;
  }
  emit({ type: "candidates", candidates });
  emit({ type: "stage", stage: "find", status: "done", detail: `${candidates.length} companies` });
  if (signal?.aborted) return;

  // Stage B2/C/D — research, analyze, prepare angles (per prospect, bounded concurrency)
  emit({ type: "stage", stage: "research", status: "active", detail: `0 of ${candidates.length}` });
  let researched = 0;
  let analyzed = 0;
  let contacted = 0;
  let withEmail = 0;
  let failed = 0;
  const concurrency = 5;

  const worker = async (candidate: Candidate) => {
    if (signal?.aborted) return;
    try {
      const research = await provider.researchProspect(candidate, brief, analysis);
      researched++;
      emit({ type: "stage", stage: "research", status: "active", detail: `${researched} of ${candidates.length}` });
      if (researched === 1) emit({ type: "stage", stage: "opportunity", status: "active" });

      const opportunity = await provider.analyzeOpportunity(candidate, research, brief, analysis);
      analyzed++;
      if (analyzed === 1) emit({ type: "stage", stage: "angles", status: "active" });
      emit({ type: "stage", stage: "opportunity", status: "active", detail: `${analyzed} of ${candidates.length}` });

      // Contact discovery is best-effort: a failure here must not lose the prospect.
      if (analyzed === 1) emit({ type: "stage", stage: "contacts", status: "active" });
      let contacts: Prospect["contacts"];
      try {
        contacts = await provider.findContact(candidate, research);
      } catch {
        contacts = { contacts: [], note: "Contact lookup failed. Use Find contact to retry." };
      }
      contacted++;
      if (contacts.contacts.some((c) => c.email && c.status === "verified")) withEmail++;
      emit({ type: "stage", stage: "contacts", status: "active", detail: `${withEmail} of ${contacted} with email` });
      const recipient = pickRecipient(contacts);

      const prospect: Prospect = {
        id: newId("pros"),
        searchId,
        createdAt: new Date().toISOString(),
        company: candidate,
        research,
        opportunity,
        emails: [],
        saved: false,
        inQueue: false,
        contacts,
        recipient,
      };
      emit({ type: "prospect", prospect });
    } catch (err) {
      failed++;
      emit({
        type: "prospect_failed",
        name: candidate.name,
        reason: err instanceof Error ? err.message : "Research failed.",
      });
    }
  };

  const queue = [...candidates];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length && !signal?.aborted) {
        const next = queue.shift();
        if (next) await worker(next);
      }
    })
  );

  const total = candidates.length - failed;
  emit({ type: "stage", stage: "research", status: "done", detail: `${researched} researched` });
  emit({ type: "stage", stage: "opportunity", status: total ? "done" : "error", detail: `${total} qualified` });
  emit({ type: "stage", stage: "angles", status: total ? "done" : "error", detail: total ? `${total * 3}+ angles` : undefined });
  emit({ type: "stage", stage: "contacts", status: total ? "done" : "error", detail: total ? `${withEmail} of ${total} with a verified email` : undefined });
  if (total === 0) {
    emit({ type: "error", message: "We found companies but couldn't verify enough information to identify strong opportunities. Try again." });
    return;
  }
  emit({ type: "done", total });
}
