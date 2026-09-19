"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink, Card, EmptyState, Icon, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export default function BriefsPage() {
  const { briefs, deleteBrief, hydrated } = useStore();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        kicker="Setup"
        title="Saved briefs"
        description="Reuse an offer and ideal-customer description. Open Find leads and pick a brief, or start a new one."
        action={
          <ButtonLink href="/app/find">
            <Icon name="plus" /> New brief
          </ButtonLink>
        }
      />

      {!hydrated ? (
        <div className="skeleton mt-6 h-40 rounded-2xl" />
      ) : briefs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Icon name="file" className="size-6" />}
            title="No briefs yet"
            description="Describe what you sell on Find leads, then save the brief to reuse it."
            action={<ButtonLink href="/app/find">Find B2B leads</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {briefs.map((b) => (
            <li key={b.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{b.name}</h2>
                    <p className="mt-1 text-xs text-zinc-500">{timeAgo(b.createdAt)}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{b.brief.offer}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{b.brief.icp}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/app/find"
                      className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium hover:bg-zinc-50"
                    >
                      Use brief
                    </Link>
                    {confirmId === b.id ? (
                      <Button size="sm" variant="danger" onClick={() => deleteBrief(b.id)}>
                        Delete
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmId(b.id)}>
                        <Icon name="trash" className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
