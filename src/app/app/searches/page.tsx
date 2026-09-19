"use client";

import Link from "next/link";
import { ButtonLink, Card, EmptyState, Icon, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export default function SearchesPage() {
  const { searches, prospects, hydrated } = useStore();

  return (
    <div>
      <PageHeader
        kicker="History"
        title="Searches"
        description="Every brief LeadLoop researched. Open one to see the companies it found."
        action={<ButtonLink href="/app/find">New search</ButtonLink>}
      />

      {!hydrated ? (
        <div className="skeleton mt-6 h-40 rounded-2xl" />
      ) : searches.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Icon name="history" className="size-6" />}
            title="No searches yet"
            description="Describe what you sell and who you sell to. Researched companies appear as they are scored."
            action={<ButtonLink href="/app/find">Find opportunities</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {searches.map((s) => {
            const count = s.prospectIds.filter((id) => prospects[id]).length;
            return (
              <li key={s.id}>
                <Link href={`/app/searches/${s.id}`}>
                  <Card className="p-5 transition-colors hover:border-brand-200">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">{s.brief.icp}</h2>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{s.brief.offer}</p>
                        <p className="mt-2 text-xs text-zinc-400">
                          {count} prospects · {timeAgo(s.createdAt)}
                          {s.brief.location ? ` · ${s.brief.location}` : ""}
                        </p>
                      </div>
                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">Completed</span>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
