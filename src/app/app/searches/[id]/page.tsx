"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CompanyTable } from "@/components/company-table";
import { ExportButton } from "@/components/export-button";
import { Button, ButtonLink, Card, EmptyState, Icon, PageHeader, SectionLabel } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function SearchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { searches, prospects, createCampaign, hydrated } = useStore();
  const search = searches.find((s) => s.id === id);
  const members = (search?.prospectIds ?? []).map((pid) => prospects[pid]).filter(Boolean);

  if (!hydrated) return <div className="skeleton h-48 rounded-2xl" />;
  if (!search) {
    return (
      <EmptyState
        title="Search not found"
        description="This search may have been cleared."
        action={<ButtonLink href="/app/searches">Back to history</ButtonLink>}
      />
    );
  }

  return (
    <div>
      <Link href="/app/searches" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-ink">
        <Icon name="arrow-left" className="size-3.5" /> History
      </Link>
      <div className="mt-4">
        <PageHeader
          title={search.brief.icp}
          description={search.brief.offer}
          action={
            <>
              <ExportButton prospects={members} />
              <Button
                variant="secondary"
                onClick={() => {
                  const campaign = createCampaign({
                    name: search.brief.icp.slice(0, 48),
                    objective: search.brief.offer,
                    prospectIds: search.prospectIds,
                    searchId: search.id,
                  });
                  router.push(`/app/campaigns/${campaign.id}`);
                }}
                disabled={members.length === 0}
              >
                <Icon name="megaphone" /> Start campaign
              </Button>
            </>
          }
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <SectionLabel>Location</SectionLabel>
          <p className="mt-2 text-sm text-zinc-700">{search.brief.location || "Not specified"}</p>
        </Card>
        <Card className="p-4">
          <SectionLabel>Industries</SectionLabel>
          <p className="mt-2 text-sm text-zinc-700">{search.analysis.targetIndustries.join(", ") || "—"}</p>
        </Card>
        <Card className="p-4">
          <SectionLabel>Buying signals</SectionLabel>
          <p className="mt-2 text-sm text-zinc-700">{search.analysis.buyingSignals.slice(0, 3).join("; ") || "—"}</p>
        </Card>
      </div>

      <div className="mt-6">
        {members.length === 0 ? (
          <EmptyState title="No prospects saved from this search" description="They may have been cleared." />
        ) : (
          <CompanyTable prospects={members} />
        )}
      </div>
    </div>
  );
}
