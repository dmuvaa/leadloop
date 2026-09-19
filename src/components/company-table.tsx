"use client";

import Link from "next/link";
import { CompanyMark, ProspectStatusBadge } from "@/components/ui";
import type { Prospect } from "@/lib/schemas";
import { prospectStatus } from "@/lib/schemas";
import { hostOf } from "@/lib/utils";

export function CompanyTable({ prospects }: { prospects: Prospect[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-100 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Industry</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 text-right font-medium">Fit</th>
            <th className="px-4 py-3 text-right font-medium">Opp</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((p) => (
            <tr key={p.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <CompanyMark name={p.company.name} size="sm" />
                  <div className="min-w-0">
                    <Link href={`/app/prospects/${p.id}`} className="font-medium hover:underline">
                      {p.company.name}
                    </Link>
                    <div className="truncate text-xs text-zinc-500">{p.company.website ? hostOf(p.company.website) : "—"}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {p.recipient?.email ? (
                  <div>
                    <div className="truncate">{p.recipient.email}</div>
                    {p.recipient.name && <div className="text-xs text-zinc-400">{p.recipient.name}</div>}
                  </div>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-zinc-600">{p.company.industry}</td>
              <td className="px-4 py-3 text-zinc-600">{p.company.location}</td>
              <td className="tabular px-4 py-3 text-right font-medium">{p.opportunity.icpFit}</td>
              <td className="tabular px-4 py-3 text-right font-medium">{p.opportunity.opportunityScore}</td>
              <td className="px-4 py-3">
                <ProspectStatusBadge status={prospectStatus(p)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
