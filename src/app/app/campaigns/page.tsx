"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink, Card, EmptyState, Field, Icon, PageHeader, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function CampaignsPage() {
  const { campaigns, lists, searches, createCampaign, hydrated } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [source, setSource] = useState("");

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const [kind, id] = source.split(":");
    const list = kind === "list" ? lists.find((l) => l.id === id) : undefined;
    const search = kind === "search" ? searches.find((s) => s.id === id) : undefined;
    const prospectIds = list?.prospectIds ?? search?.prospectIds ?? [];
    const campaign = createCampaign({
      name: name.trim(),
      objective: objective.trim(),
      prospectIds,
      listId: list?.id,
      searchId: search?.id,
    });
    queueMicrotask(() => router.push(`/app/campaigns/${campaign.id}`));
  };

  return (
    <div>
      <PageHeader
        kicker="Activation"
        title="Campaigns"
        description="Create a named outreach batch from a list or a search. Sending still happens from the queue, one approved email at a time."
        action={<ButtonLink href="/app/queue">Open queue</ButtonLink>}
      />

      <Card className="mt-6 p-5">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Icon name="megaphone" /> New campaign
        </div>
        <p className="mt-1 text-sm text-zinc-500">Start from a hunt’s companies, or from a named list.</p>
        <form onSubmit={start} className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="April accounting outreach" className={inputClass} required />
          </Field>
          <Field label="Source" optional>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
              <option value="">Empty campaign</option>
              {lists.map((l) => (
                <option key={l.id} value={`list:${l.id}`}>
                  List · {l.name} ({l.prospectIds.length})
                </option>
              ))}
              {searches.map((s) => (
                <option key={s.id} value={`search:${s.id}`}>
                  Search · {s.brief.icp.slice(0, 48)} ({s.prospectIds.length})
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Objective" optional>
              <input
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Book intro calls with high-opportunity fits"
                className={inputClass}
              />
            </Field>
          </div>
          <div>
            <Button type="submit">Create campaign</Button>
          </div>
        </form>
      </Card>

      {!hydrated ? (
        <div className="skeleton mt-6 h-40 rounded-2xl" />
      ) : campaigns.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Icon name="megaphone" className="size-6" />}
            title="No campaigns yet"
            description="Create one from a list or a saved search above."
            action={<ButtonLink href="/app/lists">Open lists</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link href={`/app/campaigns/${c.id}`} className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-card transition-colors hover:border-brand-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{c.name}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{c.objective || "No objective"}</p>
                  </div>
                  <span className="tabular text-sm text-zinc-500">{c.prospectIds.length} companies</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
