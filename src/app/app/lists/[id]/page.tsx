"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CompanyTable } from "@/components/company-table";
import { ExportButton } from "@/components/export-button";
import { Button, ButtonLink, EmptyState, Icon, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lists, prospects, deleteList, createCampaign, hydrated } = useStore();
  const list = lists.find((l) => l.id === id);
  const members = (list?.prospectIds ?? []).map((pid) => prospects[pid]).filter(Boolean);

  if (!hydrated) return <div className="skeleton h-48 rounded-2xl" />;
  if (!list) {
    return (
      <EmptyState
        title="List not found"
        description="This list may have been deleted."
        action={<ButtonLink href="/app/lists">Back to lists</ButtonLink>}
      />
    );
  }

  return (
    <div>
      <Link href="/app/lists" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-ink">
        <Icon name="arrow-left" className="size-3.5" /> Lists
      </Link>
      <div className="mt-4">
        <PageHeader
          title={list.name}
          description={list.description || `${members.length} companies in this list.`}
          action={
            <>
              <ExportButton prospects={members} />
              <Button
                variant="secondary"
                onClick={() => {
                  const campaign = createCampaign({
                    name: `${list.name} campaign`,
                    objective: "Reach the companies on this list with research-backed outreach.",
                    prospectIds: list.prospectIds,
                    listId: list.id,
                  });
                  router.push(`/app/campaigns/${campaign.id}`);
                }}
                disabled={members.length === 0}
              >
                <Icon name="megaphone" /> Start campaign
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm("Delete this list? Companies stay in your workspace.")) {
                    deleteList(list.id);
                    router.push("/app/lists");
                  }
                }}
              >
                <Icon name="trash" />
              </Button>
            </>
          }
        />
      </div>
      <div className="mt-6">
        {members.length === 0 ? (
          <EmptyState
            title="This list is empty"
            description="Open a prospect and use Save to list."
            action={<ButtonLink href="/app/prospects">Browse prospects</ButtonLink>}
          />
        ) : (
          <CompanyTable prospects={members} />
        )}
      </div>
    </div>
  );
}
