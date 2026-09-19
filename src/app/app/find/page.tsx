"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ResearchForm } from "@/components/research-form";
import { ResearchProgress, initialStages, type StageState } from "@/components/research-progress";
import { ProspectFeed } from "@/components/prospect-feed";
import { Button, Card, Icon, PageHeader, SectionLabel } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Brief, OfferAnalysis, PipelineEvent, Prospect } from "@/lib/schemas";

type Phase = "form" | "running" | "done" | "error";

export default function FindPage() {
  const store = useStore();
  const [phase, setPhase] = useState<Phase>("form");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [stages, setStages] = useState<StageState>(initialStages());
  const [analysis, setAnalysis] = useState<OfferAnalysis | null>(null);
  const [meta, setMeta] = useState<{ searchId: string; providerName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    async (b: Brief) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setBrief(b);
      setPhase("running");
      setStages(initialStages());
      setAnalysis(null);
      setMeta(null);
      setError(null);
      setFailed([]);
      setIds([]);

      let searchId: string | null = null;
      let pendingAnalysis: OfferAnalysis | null = null;
      let searchCreated = false;

      const ensureSearch = () => {
        if (searchCreated || !searchId || !pendingAnalysis) return;
        store.addSearch({ id: searchId, brief: b, analysis: pendingAnalysis, createdAt: new Date().toISOString(), prospectIds: [] });
        searchCreated = true;
      };

      const handle = (e: PipelineEvent) => {
        switch (e.type) {
          case "meta":
            searchId = e.searchId;
            setMeta({ searchId: e.searchId, providerName: e.providerName });
            break;
          case "stage":
            setStages((s) => ({ ...s, [e.stage]: { status: e.status, detail: e.detail } }));
            break;
          case "analysis":
            pendingAnalysis = e.analysis;
            setAnalysis(e.analysis);
            ensureSearch();
            break;
          case "candidates":
            break;
          case "prospect": {
            ensureSearch();
            const p: Prospect = e.prospect;
            store.upsertProspect(p);
            setIds((prev) => [...prev, p.id]);
            break;
          }
          case "prospect_failed":
            setFailed((f) => [...f, e.name]);
            break;
          case "done":
            setPhase("done");
            break;
          case "error":
            setError(e.message);
            setPhase("error");
            break;
        }
      };

      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...b, excludeDomains: store.excludedDomains }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Research unavailable. Try again.");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              handle(JSON.parse(line) as PipelineEvent);
            } catch {
              /* skip malformed line */
            }
          }
        }
        if (buf.trim()) {
          try {
            handle(JSON.parse(buf) as PipelineEvent);
          } catch {
            /* ignore */
          }
        }
        setPhase((p) => (p === "running" ? "done" : p));
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Research unavailable. Try again.");
        setPhase("error");
      }
    },
    [store]
  );

  const prospects = ids.map((id) => store.prospects[id]).filter(Boolean);
  const running = phase === "running";

  return (
    <div>
      <PageHeader
        kicker="Research"
        title="Find opportunities"
        description="Start with your website. LeadLoop reads it, you review the brief, then it finds the reason to reach out — or skip and write the brief yourself."
        action={
          phase !== "form" ? (
            <Button
              variant="secondary"
              onClick={() => {
                abortRef.current?.abort();
                setPhase("form");
              }}
            >
              <Icon name="refresh" /> New search
            </Button>
          ) : undefined
        }
      />

      <div className="mt-6">
        {phase === "form" ? (
          <ResearchForm onSubmit={run} initial={brief ?? undefined} />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
            <div className="space-y-4">
              <ResearchProgress stages={stages} providerName={meta?.providerName} />
              {brief && (
                <Card className="p-4 text-sm">
                  <SectionLabel>Your brief</SectionLabel>
                  <p className="mt-2 text-zinc-700">{brief.offer}</p>
                  <SectionLabel className="mt-3">Ideal customer</SectionLabel>
                  <p className="mt-1 text-zinc-700">{brief.icp}</p>
                  {brief.website && (
                    <p className="mt-1 text-zinc-500">
                      Website: {brief.website.replace(/^https?:\/\//, "")}
                      {brief.seller ? " · reviewed" : ""}
                    </p>
                  )}
                  {brief.location && <p className="mt-1 text-zinc-500">Location: {brief.location}</p>}
                  {brief.seller && (
                    <>
                      <SectionLabel className="mt-3">Outreach voice</SectionLabel>
                      <p className="mt-1 text-zinc-700">{brief.seller.outreach.tone}</p>
                      <p className="mt-1 text-xs text-zinc-500">{brief.seller.outreach.cta}</p>
                    </>
                  )}
                </Card>
              )}
              {analysis && (
                <Card className="p-4 text-sm animate-rise">
                  <SectionLabel>What we&apos;re looking for</SectionLabel>
                  <ul className="mt-2 space-y-1.5 text-zinc-700">
                    {analysis.buyingSignals.slice(0, 4).map((s) => (
                      <li key={s} className="flex gap-2">
                        <span className="mt-[7px] size-1 shrink-0 rounded-full bg-zinc-400" />
                        {s}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {analysis.targetIndustries.slice(0, 5).map((i) => (
                      <span key={i} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">{i}</span>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <div>
              {phase === "error" && (
                <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <div className="flex gap-2">
                    <Icon name="alert" className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                  {brief && (
                    <Button size="sm" variant="secondary" onClick={() => run(brief)}>
                      Try again
                    </Button>
                  )}
                </div>
              )}
              {failed.length > 0 && phase !== "running" && (
                <p className="mb-4 text-xs text-zinc-500">
                  Couldn&apos;t verify enough information for {failed.length} {failed.length === 1 ? "company" : "companies"}: {failed.join(", ")}.
                </p>
              )}

              <div className="mb-3 flex items-center justify-between">
                <SectionLabel>
                  {running ? "Opportunities arriving" : `${prospects.length} opportunities`}
                </SectionLabel>
                {running && <span className="text-xs text-zinc-500 tabular">{prospects.length} ready</span>}
              </div>

              {prospects.length === 0 && running ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="flex items-center gap-3">
                        <div className="skeleton size-10 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-3.5 w-1/2 rounded" />
                          <div className="skeleton h-3 w-1/3 rounded" />
                        </div>
                      </div>
                      <div className="mt-5 space-y-2">
                        <div className="skeleton h-3 w-full rounded" />
                        <div className="skeleton h-3 w-5/6 rounded" />
                        <div className="skeleton h-3 w-2/3 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ProspectFeed prospects={prospects} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
