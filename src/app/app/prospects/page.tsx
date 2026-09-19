"use client";

import { useMemo, useState } from "react";
import { CompanyTable } from "@/components/company-table";
import { ExportButton } from "@/components/export-button";
import { ProspectFeed } from "@/components/prospect-feed";
import { ButtonLink, Icon, PageHeader, compactInputClass } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function ProspectsPage() {
  const { list, searches, hydrated } = useStore();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [huntId, setHuntId] = useState("all");

  const filtered = useMemo(
    () => (huntId === "all" ? list : list.filter((p) => p.searchId === huntId)),
    [list, huntId]
  );

  return (
    <div>
      <PageHeader
        kicker="Companies"
        title="Prospects"
        description="Every company LeadLoop has researched, across all searches."
        action={
          <>
            <ExportButton prospects={filtered} />
            <ButtonLink href="/app/find" variant="secondary">
              <Icon name="search" /> New search
            </ButtonLink>
          </>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <select value={huntId} onChange={(e) => setHuntId(e.target.value)} className={cn(compactInputClass, "h-8 text-[13px]")}>
          <option value="all">All searches</option>
          {searches.map((s) => (
            <option key={s.id} value={s.id}>
              {s.brief.icp.slice(0, 48)}
            </option>
          ))}
        </select>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 text-[13px]">
          {(
            [
              ["cards", "Cards", "grid"],
              ["table", "Table", "table"],
            ] as const
          ).map(([k, label, icon]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium",
                view === k ? "bg-zinc-100 text-ink" : "text-zinc-500 hover:text-ink"
              )}
            >
              <Icon name={icon} className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {!hydrated ? (
          <div className="skeleton h-40 rounded-2xl" />
        ) : view === "table" ? (
          filtered.length === 0 ? (
            <ProspectFeed
              prospects={[]}
              emptyAction={
                <ButtonLink href="/app/find">
                  <Icon name="search" /> Find Opportunities
                </ButtonLink>
              }
            />
          ) : (
            <CompanyTable prospects={filtered} />
          )
        ) : (
          <ProspectFeed
            prospects={filtered}
            emptyAction={
              <ButtonLink href="/app/find">
                <Icon name="search" /> Find Opportunities
              </ButtonLink>
            }
          />
        )}
      </div>
    </div>
  );
}
