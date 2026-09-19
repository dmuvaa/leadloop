"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Field, Icon, PageHeader, inputClass } from "@/components/ui";
import { useMailConfig } from "@/components/send-panel";
import { useStore } from "@/lib/store";
import { domainOf } from "@/lib/utils";

type Status = {
  provider: "openai" | "anthropic" | null;
  openai: boolean;
  anthropic: boolean;
  gmail: boolean;
  senderName: boolean;
  signature: boolean;
  from: string | null;
  dailyCap: number;
  sentToday: number;
};

export default function SettingsPage() {
  const { settings, updateSettings, suppressions, addSuppression, removeSuppression, clearAll, list } = useStore();
  const { config } = useMailConfig();
  const [status, setStatus] = useState<Status | null>(null);
  const [name, setName] = useState(settings.name);
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [website, setWebsite] = useState(settings.website);
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(settings.name);
    setCompanyName(settings.companyName);
    setWebsite(settings.website);
  }, [settings]);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStatus(data as Status))
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <PageHeader
        kicker="Workspace"
        title="Settings"
        description="Workspace profile, suppressions, integrations, and local data. Keys never leave the server."
      />

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        {[
          ["#workspace", "Workspace"],
          ["#integrations", "Integrations"],
          ["#suppressions", "Suppressions"],
          ["#data", "Data"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full border border-zinc-200 bg-white px-3 py-1 hover:border-brand-200">
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-5">
        <Card id="workspace" className="p-5">
          <h2 className="text-lg font-semibold">Workspace</h2>
          <p className="mt-1 text-sm text-zinc-500">Shown in the sidebar. Used only on this device.</p>
          <form
            className="mt-4 grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              updateSettings({ name: name.trim() || "My workspace", companyName: companyName.trim(), website: website.trim() });
              setSaved(true);
              setTimeout(() => setSaved(false), 1600);
            }}
          >
            <Field label="Workspace name">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Your company" optional>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Website" optional>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={inputClass} />
            </Field>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary">
                Save profile
              </Button>
              {saved && <span className="text-sm text-brand-700">Saved</span>}
            </div>
          </form>
        </Card>

        <Card id="integrations" className="p-5">
          <h2 className="text-lg font-semibold">Integrations</h2>
          <p className="mt-1 text-sm text-zinc-500">Configured via environment variables. Restart the server after changing `.env.local`.</p>
          <div className="mt-4 space-y-2">
            <IntegrationRow
              label="OpenAI"
              ok={status?.openai ?? false}
              detail={
                status?.openai
                  ? status.provider === "openai"
                    ? "OPENAI_API_KEY is set · in use"
                    : "OPENAI_API_KEY is set"
                  : "Set OPENAI_API_KEY"
              }
            />
            <IntegrationRow
              label="Claude"
              ok={status?.anthropic ?? false}
              detail={
                status?.anthropic
                  ? status.provider === "anthropic"
                    ? "ANTHROPIC_API_KEY is set · in use"
                    : "ANTHROPIC_API_KEY is set"
                  : "Set ANTHROPIC_API_KEY"
              }
            />
            <IntegrationRow
              label="Gmail SMTP"
              ok={status?.gmail ?? Boolean(config?.configured)}
              detail={
                status?.gmail || config?.configured
                  ? `Sends from ${status?.from ?? config?.from} · ${status?.sentToday ?? config?.sentToday ?? 0} of ${status?.dailyCap ?? config?.dailyCap ?? 20} today`
                  : "Set GMAIL_USER and GMAIL_APP_PASSWORD"
              }
            />
            <IntegrationRow
              label="Sender name"
              ok={Boolean(status?.senderName)}
              detail={status?.senderName ? "Replaces [Your name] in drafts" : "Optional SENDER_NAME"}
            />
            <IntegrationRow
              label="Signature"
              ok={Boolean(status?.signature)}
              detail={status?.signature ? "Appended to sent emails" : "Optional SENDER_SIGNATURE"}
            />
          </div>
        </Card>

        <Card id="suppressions" className="p-5">
          <h2 className="text-lg font-semibold">Suppression list</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Domains and emails to exclude from discovery and sending. {list.length} prospects in this workspace.
          </p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const eAddr = email.trim();
              const d = domainOf(domain) || domain.trim().toLowerCase();
              if (!eAddr && !d) return;
              addSuppression({ email: eAddr || undefined, domain: d || undefined, reason: reason.trim() || undefined });
              setEmail("");
              setDomain("");
              setReason("");
            }}
          >
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className={inputClass} />
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className={inputClass} />
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className={inputClass} />
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
          {suppressions.length > 0 ? (
            <ul className="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
              {suppressions.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{row.email ?? row.domain}</p>
                    <p className="text-zinc-500">{row.reason || "No reason"}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeSuppression(row.id)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">Nothing suppressed yet.</p>
          )}
        </Card>

        <Card id="data" className="p-5">
          <h2 className="text-lg font-semibold">Local data</h2>
          <p className="mt-1 text-sm text-zinc-500">
            LeadLoop stores research, lists and campaigns in this browser. Clearing cannot be undone.
          </p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => {
              if (window.confirm("Clear all local research, lists, campaigns and the outreach queue?")) clearAll();
            }}
          >
            <Icon name="trash" /> Clear local data
          </Button>
        </Card>
      </div>
    </div>
  );
}

function IntegrationRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-2.5">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-zinc-500">{detail}</p>
      </div>
      <Badge tone={ok ? "brand" : "neutral"}>{ok ? "Ready" : "Missing"}</Badge>
    </div>
  );
}
