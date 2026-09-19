"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { InboxActions } from "@/components/inbox-actions";
import { ButtonLink, Card, CompanyMark, EmptyState, Icon, PageHeader, Score } from "@/components/ui";
import { useStore } from "@/lib/store";
import { prospectStatus } from "@/lib/schemas";
import { compactInputClass } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  const { list, hydrated } = useStore();
  const [q, setQ] = useState("");
  const inbox = useMemo(() => {
    const term = q.trim().toLowerCase();
    return list
      .filter((p) => prospectStatus(p) === "inbox")
      .filter((p) => !term || `${p.company.name} ${p.company.industry} ${p.opportunity.recommendedAngle.title}`.toLowerCase().includes(term))
      .sort((a, b) => b.opportunity.opportunityScore - a.opportunity.opportunityScore);
  }, [list, q]);

  return (
    <div>
      <PageHeader
        kicker="Review"
        title="Inbox"
        description="Keep the companies worth working. Skip the rest. Drafts stay on the prospect — nothing is sent from here."
        action={<ButtonLink href="/app/find">Find opportunities</ButtonLink>}
      />

      <div className="mt-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by company, industry or angle"
          className={cn(compactInputClass, "h-10 w-full max-w-md px-3")}
        />
      </div>

      {!hydrated ? (
        <div className="skeleton mt-6 h-48 rounded-2xl" />
      ) : inbox.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Icon name="inbox" className="size-6" />}
            title={q ? "No matching companies" : "Inbox is clear"}
            description={
              q
                ? "Try another filter, or clear it to see companies waiting for review."
                : "Run a search. Scored companies land here for Keep or Skip."
            }
            action={<ButtonLink href={q ? "/app/inbox" : "/app/find"}>{q ? "Clear filter" : "Find opportunities"}</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {inbox.map((p) => (
            <li key={p.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <CompanyMark name={p.company.name} />
                    <div className="min-w-0">
                      <Link href={`/app/prospects/${p.id}`} className="font-semibold hover:underline">
                        {p.company.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {p.company.industry} · {p.company.location}
                      </p>
                      {p.recipient?.email && <p className="mt-1 text-sm text-brand-800">{p.recipient.email}</p>}
                      <p className="mt-2 text-sm text-zinc-800">{p.opportunity.recommendedAngle.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{p.opportunity.opportunity}</p>
                      <div className="mt-4">
                        <InboxActions prospectId={p.id} />
                      </div>
                    </div>
                  </div>
                  <Score label="Opportunity" value={p.opportunity.opportunityScore} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
