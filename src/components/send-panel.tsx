"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Icon, compactInputClass, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Contact, Email, Prospect } from "@/lib/schemas";
import { cn, domainOf, timeAgo } from "@/lib/utils";

export type MailConfig = { configured: boolean; from?: string; senderName?: string; dailyCap: number; sentToday: number };

/** Fetches Gmail connection status once per mount. */
export function useMailConfig() {
  const [config, setConfig] = useState<MailConfig | null>(null);
  const refresh = useCallback(() => {
    fetch("/api/send", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setConfig(data as MailConfig);
      })
      .catch(() => {
        /* leave null → treated as not connected */
      });
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { config, refresh };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function pickEmail(p: Prospect): Email | undefined {
  const angleId = p.queueAngleId ?? p.opportunity.recommendedAngle.id;
  return p.emails.find((e) => e.angleId === angleId) ?? p.emails[0];
}

export function canSend(p: Prospect, config: MailConfig | null) {
  return Boolean(config?.configured && p.recipient?.email && EMAIL_RE.test(p.recipient.email) && p.approved && pickEmail(p) && !p.sent);
}

/** Sends the prospect's current email. Returns an error string or null. */
export async function sendProspectEmail(
  p: Prospect,
  markSent: (id: string, sent: NonNullable<Prospect["sent"]>) => void
): Promise<string | null> {
  const email = pickEmail(p);
  if (!email || !p.recipient) return "Nothing to send.";
  try {
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: p.recipient.email, toName: p.recipient.name, subject: email.subject, body: email.body }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Sending failed. Try again.";
    markSent(p.id, { at: data.sentAt, subject: email.subject, angleId: email.angleId, to: p.recipient.email, messageId: data.messageId });
    return null;
  } catch {
    return "Sending failed. Try again.";
  }
}

/**
 * Recipient + approval + send controls for one prospect.
 * `compact` renders a single row for the queue; default renders a stacked block.
 */
/** Runs contact discovery for a prospect and stores the result. Returns an error string or null. */
export async function findContactFor(
  p: Prospect,
  setContacts: (id: string, contacts: Prospect["contacts"], recipient?: Prospect["recipient"]) => void
): Promise<string | null> {
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate: p.company, research: p.research }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Contact lookup failed. Try again.";
    const result = data.result as NonNullable<Prospect["contacts"]>;
    const verified = result.contacts.filter((c) => c.email && c.status === "verified");
    const best =
      verified.find((c) => c.kind === "person" && c.name) ?? verified.find((c) => c.kind === "generic") ?? verified[0];
    // Only overwrite a recipient the user hasn't typed themselves.
    const recipient = best && !p.recipient?.email ? { email: best.email, name: best.name || undefined } : undefined;
    setContacts(p.id, result, recipient);
    return null;
  } catch {
    return "Contact lookup failed. Try again.";
  }
}

export function FindContactButton({ prospect: p, size = "md" }: { prospect: Prospect; size?: "sm" | "md" }) {
  const { setContacts } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    const err = await findContactFor(p, setContacts);
    if (err) setError(err);
    setBusy(false);
  };
  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="secondary" size={size} onClick={run} loading={busy} title="Search the company's public pages for a contact">
        <Icon name="search" className="size-3.5" /> {p.contacts ? "Find again" : "Find contact"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

function ContactChip({ c, onUse, active }: { c: Contact; onUse: () => void; active: boolean }) {
  const label = c.email || c.name || "Unknown";
  const sub = [c.name && c.email ? c.name : null, c.role || null].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={onUse}
      disabled={!c.email}
      title={c.email ? `Use ${c.email}` : "No email found for this person"}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-left text-xs transition-colors",
        active ? "border-brand-300 bg-brand-50 text-brand-800" : "border-zinc-200 bg-white hover:border-zinc-300",
        !c.email && "cursor-default opacity-70"
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", c.status === "verified" ? "bg-brand-500" : "bg-amber-400")} />
      <span className="truncate font-medium">{label}</span>
      {sub && <span className="truncate text-zinc-500">{sub}</span>}
      {c.status === "inferred" && <span className="text-amber-700">inferred</span>}
    </button>
  );
}

export function SendPanel({ prospect: p, config, compact }: { prospect: Prospect; config: MailConfig | null; compact?: boolean }) {
  const { setRecipient, setApproved, markSent, suppressions } = useStore();
  const [email, setEmail] = useState(p.recipient?.email ?? "");
  const [name, setName] = useState(p.recipient?.name ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const e = email.trim();
    const n = name.trim();
    if (!e && !n) return setRecipient(p.id, undefined);
    setRecipient(p.id, { email: e, name: n || undefined });
  };

  const draft = pickEmail(p);
  const validEmail = EMAIL_RE.test(email.trim());
  const suppressed = suppressions.some((s) => {
    const addr = email.trim().toLowerCase();
    const host = addr.split("@")[1] ?? domainOf(p.company.website);
    return (s.email && s.email.toLowerCase() === addr) || (s.domain && host && (host === s.domain || host.endsWith(`.${s.domain}`)));
  });
  const ready = canSend(p, config) && !suppressed;

  const send = async () => {
    setSending(true);
    setError(null);
    const err = await sendProspectEmail(p, markSent);
    if (err) setError(err);
    setSending(false);
  };

  if (p.sent) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2 text-sm", compact ? "" : "rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2")}>
        <Badge tone="brand"><Icon name="check" className="size-3" /> Sent</Badge>
        <span className="text-zinc-600">to {p.sent.to}</span>
        <span className="text-xs text-zinc-400">{timeAgo(p.sent.at)}</span>
      </div>
    );
  }

  const fields = (
    <>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={commit}
        placeholder="recipient@company.com"
        className={cn(compact ? cn(compactInputClass, "h-9 w-60") : cn(inputClass, "h-9 py-0"), email && !validEmail && "border-red-300")}
        aria-label="Recipient email"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        placeholder="First name (optional)"
        className={compact ? cn(compactInputClass, "h-9 w-44") : cn(inputClass, "h-9 py-0")}
        aria-label="Recipient name"
      />
    </>
  );

  const approve = (
    <label className={cn("inline-flex h-9 cursor-pointer select-none items-center gap-2 rounded-lg border px-3 text-sm font-medium", p.approved ? "border-brand-200 bg-brand-50 text-brand-800" : "border-zinc-200 bg-white text-zinc-700")}>
      <input type="checkbox" checked={Boolean(p.approved)} onChange={(e) => setApproved(p.id, e.target.checked)} className="accent-brand-600" disabled={!draft} />
      {p.approved ? "Approved" : "Approve"}
    </label>
  );

  const sendBtn = (
    <Button onClick={send} loading={sending} disabled={!ready} title={hint(p, config, validEmail, suppressed)}>
      <Icon name="send" /> Send
    </Button>
  );

  const found = p.contacts?.contacts ?? [];
  const contactsRow = (
    <div className="flex flex-wrap items-center gap-1.5">
      {found.map((c, i) => (
        <ContactChip
          key={i}
          c={c}
          active={Boolean(c.email) && c.email === email.trim()}
          onUse={() => {
            setEmail(c.email);
            setName(c.name);
            setRecipient(p.id, { email: c.email, name: c.name || undefined });
          }}
        />
      ))}
      {p.contacts && found.length === 0 && <span className="text-xs text-zinc-500">{p.contacts.note}</span>}
      <FindContactButton prospect={p} size="sm" />
    </div>
  );

  if (compact) {
    return (
      <div className="w-full space-y-2">
        {contactsRow}
        <div className="flex w-full flex-wrap items-center gap-2">
        {fields}
        {approve}
        {sendBtn}
        {error && <span className="text-xs text-red-600">{error}</span>}
        {!error && !ready && <span className="text-xs text-zinc-400">{hint(p, config, validEmail, suppressed)}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contactsRow}
      <div className="grid gap-2 sm:grid-cols-2">{fields}</div>
      <div className="flex flex-wrap items-center gap-2">
        {approve}
        {sendBtn}
        <span className="text-xs text-zinc-500">{error ? <span className="text-red-600">{error}</span> : hint(p, config, validEmail, suppressed)}</span>
      </div>
    </div>
  );
}

function hint(p: Prospect, config: MailConfig | null, validEmail: boolean, suppressed = false) {
  if (suppressed) return "Recipient is on the suppression list";
  if (!config?.configured) return "Gmail not connected";
  if (!pickEmail(p)) return "Generate an email first";
  if (!validEmail) return "Add a recipient email";
  if (!p.approved) return "Approve to enable sending";
  return `Sends from ${config.from}`;
}

export function GmailBanner({ config }: { config: MailConfig | null }) {
  if (config === null) return null;
  if (config.configured) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-600">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink"><span className="size-2 rounded-full bg-brand-500" /> Gmail connected</span>
        <span>{config.from}</span>
        <span className="text-zinc-400">·</span>
        <span className="tabular">{config.sentToday} of {config.dailyCap} sent today</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Icon name="alert" className="mt-0.5 shrink-0" />
      <div>
        <span className="font-medium">Gmail is not connected.</span> Add <code className="font-mono text-xs">GMAIL_USER</code> and{" "}
        <code className="font-mono text-xs">GMAIL_APP_PASSWORD</code> to <code className="font-mono text-xs">.env.local</code> and restart. You can still
        draft, approve and copy emails.{" "}
        <Link href="https://myaccount.google.com/apppasswords" target="_blank" className="underline underline-offset-2">Create an App Password</Link>
      </div>
    </div>
  );
}
