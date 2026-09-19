"use client";

import Link from "next/link";
import { Badge, Button, Card, CompanyMark, Icon, ProspectStatusBadge, Score, StatusBadge } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Prospect } from "@/lib/schemas";
import { prospectStatus } from "@/lib/schemas";
import { cn, hostOf } from "@/lib/utils";

export function ProspectCard({ prospect, className }: { prospect: Prospect; className?: string }) {
  const { toggleSaved } = useStore();
  const { company, opportunity, research } = prospect;
  const href = `/app/prospects/${prospect.id}`;

  return (
    <Card className={cn("flex flex-col rounded-2xl p-5 animate-rise", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyMark name={company.name} />
          <div className="min-w-0">
            <Link href={href} className="block truncate font-semibold leading-tight hover:underline">
              {company.name}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500">
              {company.website && (
                <>
                  <a href={company.website} target="_blank" rel="noreferrer" className="truncate hover:text-ink">
                    {hostOf(company.website)}
                  </a>
                  <span aria-hidden>·</span>
                </>
              )}
              <span className="truncate">{company.location}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <ProspectStatusBadge status={prospectStatus(prospect)} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex gap-5">
          <Score label="ICP fit" value={opportunity.icpFit} size="sm" />
          <Score label="Opportunity" value={opportunity.opportunityScore} size="sm" />
        </div>
        <Badge tone="neutral">{company.industry}</Badge>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Why this company</div>
          <p className="mt-1 line-clamp-3 text-zinc-700">{opportunity.opportunity}</p>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Signal</div>
          <p className="mt-1 line-clamp-2 text-zinc-700">{opportunity.signal}</p>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <Icon name="clock" className="mt-0.5 size-3.5 shrink-0 text-zinc-500" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Why now</span>
              <StatusBadge status={opportunity.whyNow.status} />
            </div>
            <p className="mt-0.5 line-clamp-2 text-zinc-700">{opportunity.whyNow.text}</p>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Recommended angle</div>
          <p className="mt-1 font-medium text-ink">{opportunity.recommendedAngle.title}</p>
          <p className="line-clamp-2 text-zinc-600">{opportunity.recommendedAngle.summary}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-5">
        <div className="whitespace-nowrap text-xs text-zinc-500">
          {research.evidence.filter((e) => e.status === "verified").length} verified ·{" "}
          {prospect.recipient?.email ? "Contact found" : research.researchStatus === "complete" ? "Research complete" : research.researchStatus === "partial" ? "Partial research" : "Insufficient data"}
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={href} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium hover:bg-zinc-50">
            View research
          </Link>
          <Link href={`${href}?draft=1`} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md bg-ink px-3 text-[13px] font-medium text-white hover:bg-zinc-800">
            <Icon name="mail" className="size-3.5" /> Draft email
          </Link>
          <Button
            variant="ghost"
            size="sm"
            aria-label={prospect.saved ? "Unsave" : "Save"}
            onClick={() => toggleSaved(prospect.id)}
            className={cn("px-2", prospect.saved && "text-brand-700")}
          >
            <Icon name={prospect.saved ? "bookmark-filled" : "bookmark"} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
