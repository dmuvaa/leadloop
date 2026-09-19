"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CompanyTable } from "@/components/company-table";
import { ExportButton } from "@/components/export-button";
import { Button, ButtonLink, Card, EmptyState, Icon, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { campaigns, prospects, addToQueue, deleteCampaign, hydrated } = useStore();
  const campaign = campaigns.find((c) => c.id === id);
  const members = (campaign?.prospectIds ?? []).map((pid) => prospects[pid]).filter(Boolean);
  const queued = members.filter((p) => p.inQueue).length;
  const sent = members.filter((p) => p.sent).length;

  if (!hydrated) return <div className="skeleton h-48 rounded-2xl" />;
  if (!campaign) {
    return (
      <EmptyState
        title="Campaign not found"
        description="This campaign may have been deleted."
        action={<ButtonLink href="/app/campaigns">Back to campaigns</ButtonLink>}
      />
    );
  }

  return (
    <div>
      <Link href="/app/campaigns" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-ink">
        <Icon name="arrow-left" className="size-3.5" /> Campaigns
      </Link>
      <div className="mt-4">
        <PageHeader
          title={campaign.name}
          description={campaign.objective || "A named batch of researched companies. Sending stays in the outreach queue."}
          action={
            <>
              <ExportButton prospects={members} />
              <Button
                onClick={() => {
                  members.forEach((p) => addToQueue(p.id));
                  router.push("/app/queue");
                }}
                disabled={members.length === 0}
              >
                <Icon name="send" /> Add all to queue
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm("Delete this campaign? Prospects stay in your workspace.")) {
                    deleteCampaign(campaign.id);
                    router.push("/app/campaigns");
                  }
                }}
              >
                <Icon name="trash" />
              </Button>
            </>
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ["Companies", members.length],
          ["In queue", queued],
          ["Sent", sent],
        ].map(([label, value]) => (
          <Card key={label as string} className="p-4">
            <div className="text-xs font-medium text-zinc-500">{label}</div>
            <div className="tabular mt-1 text-2xl font-semibold">{value}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        {members.length === 0 ? (
          <EmptyState
            title="No companies in this campaign"
            description="Create a campaign from a list or a search that already has prospects."
            action={<ButtonLink href="/app/lists">Open lists</ButtonLink>}
          />
        ) : (
          <CompanyTable prospects={members} />
        )}
      </div>
    </div>
  );
}
