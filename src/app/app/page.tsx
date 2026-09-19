"use client";

import Link from "next/link";
import { ProspectCard } from "@/components/prospect-card";
import { Button, ButtonLink, Card, CompanyMark, EmptyState, Icon, SectionLabel } from "@/components/ui";
import { useStore } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export default function Dashboard() {
  const { list, stats, hydrated, searches, clearAll } = useStore();
  const recent = [...list].sort((a, b) => b.opportunity.opportunityScore - a.opportunity.opportunityScore).slice(0, 4);
  const queue = list.filter((p) => p.inQueue).slice(0, 6);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Find the reason to reach out.</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            LeadLoop researches prospects, identifies real opportunities, and gives you a personalized reason to start the
            conversation.
          </p>
        </div>
        <ButtonLink href="/app/find" size="lg">
          <Icon name="search" /> Find Opportunities
        </ButtonLink>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Prospects researched", value: stats.researched },
          { label: "High-opportunity leads", value: stats.highOpportunity, hint: "score 80+" },
          { label: "Emails prepared", value: stats.emailsPrepared },
          { label: "Emails sent", value: stats.sent },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs font-medium text-zinc-500">{s.label}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="tabular text-3xl font-semibold tracking-tight">{hydrated ? s.value : "–"}</span>
              {s.hint && <span className="text-xs text-zinc-400">{s.hint}</span>}
            </div>
          </Card>
        ))}
      </div>

      {hydrated && list.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Icon name="sparkle" className="size-6" />}
            title="No research yet"
            description="Tell LeadLoop what you sell and who you want to sell to. It will research companies and find a reason to contact each one."
            action={
              <ButtonLink href="/app/find">
                <Icon name="search" /> Find Opportunities
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <SectionLabel>Recent opportunities</SectionLabel>
              <Link href="/app/prospects" className="text-xs font-medium text-zinc-600 hover:text-ink">
                View all
              </Link>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {recent.map((p) => (
                <ProspectCard key={p.id} prospect={p} />
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <SectionLabel>Outreach queue</SectionLabel>
                <Link href="/app/queue" className="text-xs font-medium text-zinc-600 hover:text-ink">
                  Open queue
                </Link>
              </div>
              <Card className="divide-y divide-zinc-100">
                {queue.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-500">
                    Nothing queued yet. Open a prospect and add it to the outreach queue.
                  </div>
                ) : (
                  queue.map((p) => {
                    const angle =
                      [p.opportunity.recommendedAngle, ...p.opportunity.alternativeAngles].find((a) => a.id === p.queueAngleId) ??
                      p.opportunity.recommendedAngle;
                    return (
                      <Link key={p.id} href={`/app/prospects/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50">
                        <CompanyMark name={p.company.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{p.company.name}</div>
                          <div className="truncate text-xs text-zinc-500">{angle.title}</div>
                        </div>
                        {p.sent ? (
                          <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[11px] font-medium text-white">Sent</span>
                        ) : p.emails.length > 0 ? (
                          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">Ready</span>
                        ) : (
                          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">Needs email</span>
                        )}
                      </Link>
                    );
                  })
                )}
              </Card>
            </section>

            <section>
              <SectionLabel className="mb-3">Recent searches</SectionLabel>
              <Card className="divide-y divide-zinc-100">
                {searches.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-zinc-500">No searches yet.</div>
                ) : (
                  searches.slice(0, 4).map((s) => (
                    <div key={s.id} className="px-4 py-3">
                      <div className="line-clamp-1 text-sm font-medium">{s.brief.icp}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                        <span className="tabular">{s.prospectIds.length} prospects</span>
                        <span aria-hidden>·</span>
                        <span>{timeAgo(s.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </Card>
              {list.length > 0 && (
                <div className="mt-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-zinc-500"
                    onClick={() => {
                      if (window.confirm("Clear all local research, saved prospects and the outreach queue?")) clearAll();
                    }}
                  >
                    <Icon name="trash" className="size-3.5" /> Clear local data
                  </Button>
                </div>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
