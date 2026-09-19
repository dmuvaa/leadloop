"use client";

import { ProspectFeed } from "@/components/prospect-feed";
import { ButtonLink, Icon } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function ProspectsPage() {
  const { list, hydrated } = useStore();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prospects</h1>
          <p className="mt-1 text-sm text-zinc-500">Every company LeadLoop has researched, across all searches.</p>
        </div>
        <ButtonLink href="/app/find" variant="secondary">
          <Icon name="search" /> New search
        </ButtonLink>
      </div>
      <div className="mt-6">
        {hydrated ? (
          <ProspectFeed
            prospects={list}
            emptyAction={
              <ButtonLink href="/app/find">
                <Icon name="search" /> Find Opportunities
              </ButtonLink>
            }
          />
        ) : (
          <div className="skeleton h-40 rounded-xl" />
        )}
      </div>
    </div>
  );
}
