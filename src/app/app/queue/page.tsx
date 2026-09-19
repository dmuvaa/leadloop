"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink, Card, CompanyMark, EmptyState, Icon, PageHeader, SectionLabel } from "@/components/ui";
import { FindContactButton, GmailBanner, SendPanel, canSend, pickEmail, sendProspectEmail, useMailConfig } from "@/components/send-panel";
import { useStore } from "@/lib/store";
import type { Prospect } from "@/lib/schemas";
import { timeAgo } from "@/lib/utils";

export default function QueuePage() {
  const { list, stats, hydrated, removeFromQueue, markSent } = useStore();
  const { config, refresh } = useMailConfig();
  const [bulk, setBulk] = useState<{ running: boolean; done: number; total: number; errors: string[] } | null>(null);

  const queued = list.filter((p) => p.inQueue);
  const sent = queued.filter((p) => p.sent);
  const ready = queued.filter((p) => !p.sent && p.emails.length > 0);
  const needsEmail = queued.filter((p) => !p.sent && p.emails.length === 0);
  const sendable = ready.filter((p) => canSend(p, config));

  const sendAll = async () => {
    setBulk({ running: true, done: 0, total: sendable.length, errors: [] });
    const errors: string[] = [];
    let done = 0;
    for (const p of sendable) {
      const err = await sendProspectEmail(p, markSent);
      if (err) errors.push(`${p.company.name}: ${err}`);
      done++;
      setBulk({ running: true, done, total: sendable.length, errors: [...errors] });
      if (err && /cap|not connected/i.test(err)) break;
    }
    setBulk({ running: false, done, total: sendable.length, errors });
    void refresh();
  };

  return (
    <div>
      <PageHeader
        kicker="Outreach"
        title="Outreach queue"
        description={hydrated ? `${queued.length} queued · ${ready.length} ready · ${sent.length} sent` : "Approve a recipient, then send from your Gmail."}
        action={
          <>
            <ButtonLink href="/app/campaigns" variant="secondary">Campaigns</ButtonLink>
            <ButtonLink href="/app/prospects" variant="secondary">Add prospects</ButtonLink>
            <Button onClick={sendAll} disabled={sendable.length === 0 || bulk?.running} loading={bulk?.running}>
              <Icon name="send" /> Send all approved{sendable.length ? ` (${sendable.length})` : ""}
            </Button>
          </>
        }
      />

      <div className="mt-5">
        <GmailBanner config={config} />
      </div>

      {bulk && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm">
          <div className="font-medium">
            {bulk.running ? `Sending ${bulk.done} of ${bulk.total}…` : `Sent ${bulk.done - bulk.errors.length} of ${bulk.total}`}
          </div>
          {bulk.errors.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-red-600">
              {bulk.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3 md:grid-cols-6">
        {[
          ["Researched", stats.researched],
          ["Qualified", stats.qualified],
          ["Emails generated", stats.emailsPrepared],
          ["Saved", stats.saved],
          ["Ready to contact", stats.readyToContact],
          ["Sent", stats.sent],
        ].map(([label, value]) => (
          <Card key={label as string} className="p-3">
            <div className="text-[11px] font-medium text-zinc-500">{label}</div>
            <div className="tabular mt-1 text-xl font-semibold">{hydrated ? value : "–"}</div>
          </Card>
        ))}
      </div>

      {hydrated && queued.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Icon name="send" className="size-6" />}
            title="Your outreach queue is empty"
            description="Open a lead, pick an angle, generate an email, and add it here. This is the list you send from."
            action={<ButtonLink href="/app/prospects">Browse prospects</ButtonLink>}
          />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <Group title="Ready to contact" count={ready.length} empty="Generate an email on a queued prospect and it will move here.">
            {ready.map((p) => <QueueRow key={p.id} prospect={p} config={config} onRemove={removeFromQueue} />)}
          </Group>
          <Group title="Needs an email" count={needsEmail.length} empty="Everything queued has an email drafted.">
            {needsEmail.map((p) => <QueueRow key={p.id} prospect={p} config={config} onRemove={removeFromQueue} />)}
          </Group>
          {sent.length > 0 && (
            <Group title="Sent" count={sent.length} empty="">
              {sent.map((p) => <QueueRow key={p.id} prospect={p} config={config} onRemove={removeFromQueue} />)}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <SectionLabel>{title}</SectionLabel>
        <span className="tabular text-xs text-zinc-400">{count}</span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>
      {count === 0 ? <p className="text-sm text-zinc-500">{empty}</p> : <Card className="divide-y divide-zinc-100">{children}</Card>}
    </section>
  );
}

function QueueRow({ prospect: p, config, onRemove }: { prospect: Prospect; config: ReturnType<typeof useMailConfig>["config"]; onRemove: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  const angle =
    [p.opportunity.recommendedAngle, ...p.opportunity.alternativeAngles].find((a) => a.id === p.queueAngleId) ?? p.opportunity.recommendedAngle;
  const email = pickEmail(p);

  const copy = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3 md:flex-nowrap">
        <CompanyMark name={p.company.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/app/prospects/${p.id}`} className="truncate text-sm font-medium hover:underline">{p.company.name}</Link>
            <span className="hidden text-xs text-zinc-400 sm:inline">{p.company.location}</span>
          </div>
          <div className="truncate text-xs text-zinc-500">
            {angle.title}
            {email ? ` · “${email.subject}”` : ""}
            {p.sent ? ` · sent ${timeAgo(p.sent.at)}` : ""}
          </div>
        </div>
        <div className="hidden items-center gap-4 text-xs text-zinc-500 md:flex">
          <span className="tabular">Opp {p.opportunity.opportunityScore}</span>
          <span className="tabular">Fit {p.opportunity.icpFit}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={`/app/prospects/${p.id}`} className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium hover:bg-zinc-50">View</Link>
          {email ? (
            <Button size="sm" variant="secondary" onClick={copy}>
              <Icon name={copied ? "check" : "copy"} className="size-3.5" /> {copied ? "Copied" : "Copy"}
            </Button>
          ) : (
            <Link href={`/app/prospects/${p.id}?draft=1`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ink px-3 text-[13px] font-medium text-white hover:bg-zinc-800">
              <Icon name="mail" className="size-3.5" /> Email
            </Link>
          )}
          <Button variant="ghost" size="sm" className="px-2 text-zinc-400 hover:text-red-600" aria-label="Remove from queue" onClick={() => onRemove(p.id)}>
            <Icon name="x" />
          </Button>
        </div>
      </div>
      {email ? (
        <div className="mt-3 md:pl-11">
          <SendPanel prospect={p} config={config} compact />
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 md:pl-11">
          {p.recipient?.email ? <span>Contact: {p.recipient.name ? `${p.recipient.name} · ` : ""}{p.recipient.email}</span> : <span>No contact email yet.</span>}
          {!p.sent && <FindContactButton prospect={p} size="sm" />}
        </div>
      )}
    </div>
  );
}
