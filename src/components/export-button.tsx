"use client";

import { Button, Icon } from "@/components/ui";
import { buildProspectCsv } from "@/lib/export";
import type { Prospect } from "@/lib/schemas";
import { downloadText } from "@/lib/utils";

export function ExportButton({ prospects, label = "Export CSV" }: { prospects: Prospect[]; label?: string }) {
  return (
    <Button
      variant="secondary"
      disabled={prospects.length === 0}
      onClick={() => downloadText("leadloop-research.csv", buildProspectCsv(prospects))}
    >
      <Icon name="download" /> {label}
    </Button>
  );
}
