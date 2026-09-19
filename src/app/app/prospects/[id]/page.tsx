"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddToList } from "@/components/add-to-list";
import { CompanyNotes } from "@/components/company-notes";
import { InboxActions } from "@/components/inbox-actions";
import { Badge, Button, Card, CompanyMark, EmptyState, Icon, ProspectStatusBadge, Score, SectionLabel, StatusBadge } from "@/components/ui";
import { FindContactButton, SendPanel, useMailConfig } from "@/components/send-panel";
import { useStore } from "@/lib/store";
import type { Angle, Brief, Email } from "@/lib/schemas";
import { prospectStatus } from "@/lib/schemas";
import { cn, hostOf, timeAgo } from "@/lib/utils";

const FALLBACK_BRIEF: Brief = { offer: "Our services", icp: "Growing businesses", location: "", count: 10, criteria: "", website: "", seeds: "", excludeDomains: [] };

export default function ProspectPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const store = useStore();
  const prospect = store.prospects[id];
  const search = store.searches.find((s) => s.id === prospect?.searchId);
  const brief = search?.brief ?? FALLBACK_BRIEF;

  const angles: Angle[] = useMemo(
    () => (prospect ? [prospect.opportunity.recommendedAngle, ...prospect.opportunity.alternativeAngles] : []),
    [prospect]
  );

  const [angleId, setAngleId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const autoDrafted = useRef(false);
  const { config: mailConfig } = useMailConfig();

  const activeAngleId = angleId ?? prospect?.queueAngleId ?? prospect?.opportunity.recommendedAngle.id ?? null;
  const activeAngle = angles.find((a) => a.id === activeAngleId) ?? angles[0];
  const currentEmail: Email | undefined = prospect?.emails.find((e) => e.angleId === activeAngle?.id);

  const generate = useCallback(
    async (angle: Angle) => {
      if (!prospect) return;
      setGenerating(true);
      setEmailError(null);
      try {
        const res = await fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidate: prospect.company,
            research: prospect.research,
            opportunity: prospect.opportunity,
            angle,
            brief,
            previousEmails: prospect.emails.map((e) => ({ subject: e.subject, body: e.body, angleId: e.angleId })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Email generation failed. Retry.");
        store.addEmail(prospect.id, data.email as Email);
      } catch (err) {
        setEmailError(err instanceof Error ? err.message : "Email generation failed. Retry.");
      } finally {
        setGenerating(false);
      }
    },
    [prospect, brief, store]
  );

  const tryAnotherAngle = () => {
    if (!activeAngle) return;
    const idx = angles.findIndex((a) => a.id === activeAngle.id);
    const next = angles[(idx + 1) % angles.length];
    setAngleId(next.id);
    if (!prospect?.emails.some((e) => e.angleId === next.id)) void generate(next);
  };

  // ?draft=1 → auto-generate on arrival if nothing exists for the active angle
  useEffect(() => {
    if (!prospect || autoDrafted.current || !store.hydrated) return;
    if (params.get("draft") !== "1" || !activeAngle || currentEmail || generating) return;
    const t = setTimeout(() => {
      autoDrafted.current = true;
      void generate(activeAngle);
    }, 0);
    return () => clearTimeout(t);
  }, [prospect, store.hydrated, params, activeAngle, currentEmail, generating, generate]);

  if (!store.hydrated) return <div className="skeleton h-64 rounded-xl" />;
  if (!prospect) {
    return (
      <EmptyState
        title="Prospect not found"
        description="This prospect isn't in your local research. It may have been cleared."
        action={<Link href="/app/prospects" className="text-sm font-medium underline">Back to prospects</Link>}
      />
    );
  }

  const { company, research, opportunity } = prospect;
  const verifiedCount = research.evidence.filter((e) => e.status === "verified").length;

  const copy = async () => {
    if (!currentEmail) return;
    await navigator.clipboard.writeText(`Subject: ${currentEmail.subject}\n\n${currentEmail.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div>
      <Link href="/app/prospects" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-ink">
        <Icon name="arrow-left" className="size-3.5" /> Prospects
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <CompanyMark name={company.name} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
              <ProspectStatusBadge status={prospectStatus(prospect)} />
              {prospect.inQueue && <Badge tone="brand"><Icon name="check" className="size-3" /> In outreach queue</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-zinc-500">
              {company.website && (
                <>
                  <a href={company.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
                    {hostOf(company.website)} <Icon name="external" className="size-3" />
                  </a>
                  <span aria-hidden>·</span>
                </>
              )}
              <span>{company.industry}</span>
              <span aria-hidden>·</span>
              <span>{company.location}</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-zinc-700">{company.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {prospect.recipient?.email ? (
                <span className="inline-flex items-center gap-1.5 text-zinc-700">
                  <Icon name="mail" className="size-3.5 text-zinc-400" />
                  {prospect.recipient.name ? `${prospect.recipient.name} · ` : ""}
                  {prospect.recipient.email}
                </span>
              ) : (
                <span className="text-zinc-500">No contact email yet.</span>
              )}
              {prospect.emails.length === 0 && <FindContactButton prospect={prospect} size="sm" />}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {prospectStatus(prospect) === "inbox" && <InboxActions prospectId={prospect.id} showOpen={false} />}
          <Button variant="secondary" onClick={() => store.toggleSaved(prospect.id)} className={cn(prospect.saved && "text-brand-700")}>
            <Icon name={prospect.saved ? "bookmark-filled" : "bookmark"} /> {prospect.saved ? "Saved" : "Save"}
          </Button>
          {prospect.inQueue ? (
            <Button variant="secondary" onClick={() => store.removeFromQueue(prospect.id)}>
              <Icon name="x" /> Remove from queue
            </Button>
          ) : (
            <Button onClick={() => store.addToQueue(prospect.id, activeAngle?.id)}>
              <Icon name="plus" /> Add to outreach queue
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left: research */}
        <div className="space-y-5">
          {/* Scores */}
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex gap-8">
                <Score label="ICP fit" value={opportunity.icpFit} size="lg" />
                <Score label="Opportunity score" value={opportunity.opportunityScore} size="lg" />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                {[
                  ["ICP fit", opportunity.breakdown.icpFit],
                  ["Problem relevance", opportunity.breakdown.problemRelevance],
                  ["Timing", opportunity.breakdown.timing],
                  ["Evidence confidence", opportunity.breakdown.evidenceConfidence],
                ].map(([label, v]) => (
                  <div key={label as string}>
                    <div className="text-[11px] text-zinc-500">{label}</div>
                    <div className="tabular font-semibold">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              AI-estimated based on ICP fit, observable signals, problem relevance, and available evidence. Rough guidance, not a measurement.
            </p>
          </Card>

          <Card className="p-5">
            <SectionLabel>Why they fit</SectionLabel>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">{opportunity.whyFit}</p>
          </Card>

          <Card className="p-5">
            <SectionLabel>Opportunity</SectionLabel>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">{opportunity.opportunity}</p>
            <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm">
              <span className="font-medium">Strongest signal: </span>
              <span className="text-zinc-700">{opportunity.signal}</span>
            </div>
          </Card>

          <Card className="border-brand-200 bg-brand-50/40 p-5">
            <div className="flex items-center gap-2">
              <Icon name="clock" className="text-brand-700" />
              <SectionLabel className="text-brand-800">Why now?</SectionLabel>
              <StatusBadge status={opportunity.whyNow.status} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-800">{opportunity.whyNow.text}</p>
          </Card>

          {/* Evidence */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <SectionLabel>Evidence</SectionLabel>
              <span className="text-xs text-zinc-500">
                {verifiedCount} verified · {research.evidence.length - verifiedCount} inferred or unverified
              </span>
            </div>
            <ul className="mt-3 divide-y divide-zinc-100">
              {research.evidence.map((e, i) => (
                <li key={i} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm text-zinc-800">{e.claim}</p>
                    <div className="mt-1 text-xs text-zinc-500">
                      {e.source ? (
                        <a href={e.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono hover:text-ink">
                          {e.source.replace(/^https?:\/\//, "")} <Icon name="external" className="size-3" />
                        </a>
                      ) : (
                        <span>Not verified</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 sm:justify-end">
                    <StatusBadge status={e.status} />
                    <Badge tone="outline">Confidence: {e.confidence}</Badge>
                  </div>
                </li>
              ))}
            </ul>
            {research.researchStatus !== "complete" && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {research.researchStatus === "partial"
                  ? "Research is partial. Some claims could not be verified against a source."
                  : "We found the company, but couldn't verify enough information to identify a strong opportunity."}
              </p>
            )}
          </Card>

          {/* Research details */}
          <Card className="p-5">
            <SectionLabel>Lists</SectionLabel>
            <div className="mt-3">
              <AddToList prospectId={prospect.id} />
            </div>
            {(prospect.listIds ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(prospect.listIds ?? []).map((lid) => {
                  const list = store.lists.find((l) => l.id === lid);
                  return list ? (
                    <Link key={lid} href={`/app/lists/${lid}`} className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
                      {list.name}
                    </Link>
                  ) : null;
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionLabel>Notes</SectionLabel>
            <div className="mt-3">
              <CompanyNotes prospectId={prospect.id} notes={prospect.notes} />
            </div>
          </Card>

          <Card className="p-5">
            <SectionLabel>Research notes</SectionLabel>
            <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-zinc-500">Products &amp; services</dt>
                <dd className="mt-1 text-zinc-700">{research.productsServices.join(", ") || "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Target customers</dt>
                <dd className="mt-1 text-zinc-700">{research.targetCustomers || "Unknown"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-zinc-500">Website observations</dt>
                <dd className="mt-1">
                  <ul className="space-y-1 text-zinc-700">
                    {research.websiteObservations.length ? research.websiteObservations.map((o) => <li key={o}>• {o}</li>) : <li>None recorded.</li>}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Hiring signals</dt>
                <dd className="mt-1 text-zinc-700">{research.hiringSignals.length ? research.hiringSignals.join("; ") : "None found"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Public signals</dt>
                <dd className="mt-1 text-zinc-700">{research.publicSignals.length ? research.publicSignals.join("; ") : "None found"}</dd>
              </div>
            </dl>
          </Card>
        </div>

        {/* Right: outreach */}
        <div className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <Card className="p-5">
            <SectionLabel>Recommended outreach</SectionLabel>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">{opportunity.outreachAdvice}</p>

            <div className="mt-4 text-xs font-medium text-zinc-500">Angles</div>
            <div className="mt-2 space-y-1.5">
              {angles.map((a, i) => {
                const active = a.id === activeAngle?.id;
                const has = prospect.emails.some((e) => e.angleId === a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => setAngleId(a.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                      active ? "border-ink bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-300"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{a.title}</span>
                      <span className="flex items-center gap-1">
                        {i === 0 && <Badge tone="brand">Recommended</Badge>}
                        {has && <Badge tone="outline"><Icon name="mail" className="size-3" /> Drafted</Badge>}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-600">{a.summary}</p>
                    {active && <p className="mt-1.5 text-xs text-zinc-500">{a.rationale}</p>}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <SectionLabel>Email</SectionLabel>
              {activeAngle && <span className="text-xs text-zinc-500">{activeAngle.title}</span>}
            </div>

            {emailError && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <span>{emailError}</span>
                <Button size="sm" variant="secondary" onClick={() => activeAngle && generate(activeAngle)}>Retry</Button>
              </div>
            )}

            {generating ? (
              <div className="mt-3 space-y-2">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-11/12 rounded" />
                <div className="skeleton h-3 w-4/5 rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
                <p className="pt-1 text-xs text-zinc-500">Writing from the research, not a template of compliments…</p>
              </div>
            ) : currentEmail ? (
              <div className="mt-3 animate-rise">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
                  <div className="text-sm font-medium">{currentEmail.subject}</div>
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-800">{currentEmail.body}</pre>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {currentEmail.rationale} · {currentEmail.body.trim().split(/\s+/).length} words · {timeAgo(currentEmail.createdAt)}
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
                No email drafted for this angle yet.
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {currentEmail ? (
                <Button variant="secondary" onClick={() => activeAngle && generate(activeAngle)} disabled={generating}>
                  <Icon name="refresh" /> Regenerate
                </Button>
              ) : (
                <Button onClick={() => activeAngle && generate(activeAngle)} disabled={generating}>
                  <Icon name="sparkle" /> Generate email
                </Button>
              )}
              <Button variant="secondary" onClick={tryAnotherAngle} disabled={generating || angles.length < 2}>
                <Icon name="refresh" /> Try another angle
              </Button>
              <Button variant="secondary" onClick={copy} disabled={!currentEmail}>
                <Icon name={copied ? "check" : "copy"} /> {copied ? "Copied" : "Copy"}
              </Button>
              {!prospect.inQueue && (
                <Button onClick={() => store.addToQueue(prospect.id, activeAngle?.id)} className="w-full sm:w-auto">
                  <Icon name="plus" /> Add to outreach queue
                </Button>
              )}
            </div>

            {prospect.emails.length > 0 && (
              <div className="mt-5 border-t border-zinc-100 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <SectionLabel>Send</SectionLabel>
                  {mailConfig && !mailConfig.configured && <span className="text-xs text-amber-700">Gmail not connected</span>}
                </div>
                <SendPanel prospect={prospect} config={mailConfig} />
                <p className="mt-2 text-xs text-zinc-500">
                  Sends the email drafted for the angle chosen when you queued this prospect
                  {prospect.recipient?.name ? `, greeting ${prospect.recipient.name.split(" ")[0]} by name` : ""}. Nothing is sent without your approval.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
