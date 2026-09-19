"use client";

import { useMemo, useState } from "react";
import { ProspectCard } from "@/components/prospect-card";
import { EmptyState, Icon, compactInputClass } from "@/components/ui";
import type { Prospect } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type SortKey = "opportunity" | "icp" | "recent";

export function ProspectFeed({ prospects, emptyAction }: { prospects: Prospect[]; emptyAction?: React.ReactNode }) {
  const [sort, setSort] = useState<SortKey>("opportunity");
  const [industry, setIndustry] = useState("all");
  const [location, setLocation] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);

  const industries = useMemo(() => [...new Set(prospects.map((p) => p.company.industry))].sort(), [prospects]);

  const filtered = useMemo(() => {
    const loc = location.trim().toLowerCase();
    return prospects
      .filter((p) => industry === "all" || p.company.industry === industry)
      .filter((p) => !loc || p.company.location.toLowerCase().includes(loc))
      .filter((p) => !savedOnly || p.saved)
      .sort((a, b) => {
        if (sort === "opportunity") return b.opportunity.opportunityScore - a.opportunity.opportunityScore;
        if (sort === "icp") return b.opportunity.icpFit - a.opportunity.icpFit;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [prospects, industry, location, savedOnly, sort]);

  if (prospects.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="building" className="size-6" />}
        title="No prospects yet"
        description="Run a search and researched, scored prospects will show up here."
        action={emptyAction}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 text-[13px]">
          {(
            [
              ["opportunity", "Opportunity"],
              ["icp", "ICP fit"],
              ["recent", "Recent"],
            ] as [SortKey, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={cn("rounded-md px-2.5 py-1 font-medium", sort === k ? "bg-zinc-100 text-ink" : "text-zinc-500 hover:text-ink")}
            >
              {label}
            </button>
          ))}
        </div>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={cn(compactInputClass, "h-8 text-[13px]")}>
          <option value="all">All industries</option>
          {industries.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <div className="relative">
          <Icon name="pin" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className={cn(compactInputClass, "h-8 w-40 pl-8 text-[13px]")}
          />
        </div>
        <button
          onClick={() => setSavedOnly((v) => !v)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium",
            savedOnly ? "border-brand-200 bg-brand-50 text-brand-700" : "border-zinc-200 bg-white text-zinc-600 hover:text-ink"
          )}
        >
          <Icon name={savedOnly ? "bookmark-filled" : "bookmark"} className="size-3.5" /> Saved
        </button>
        <span className="ml-auto text-xs text-zinc-500 tabular">
          {filtered.length} of {prospects.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nothing matches those filters" description="Try clearing the industry, location or saved filter." />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((p) => (
            <ProspectCard key={p.id} prospect={p} />
          ))}
        </div>
      )}
    </div>
  );
}
