"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { useStore } from "@/lib/store";

export function InboxActions({
  prospectId,
  showOpen = true,
  compact,
}: {
  prospectId: string;
  showOpen?: boolean;
  compact?: boolean;
}) {
  const { setStatus, addToQueue } = useStore();
  const size = compact ? "sm" : "sm";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size={size} onClick={() => setStatus(prospectId, "kept")}>
        Keep
      </Button>
      <Button size={size} variant="secondary" onClick={() => setStatus(prospectId, "skipped")}>
        Skip
      </Button>
      <Button size={size} variant="secondary" onClick={() => addToQueue(prospectId)}>
        Queue
      </Button>
      {showOpen && (
        <Link
          href={`/app/prospects/${prospectId}`}
          className="inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium text-zinc-600 hover:bg-zinc-50 hover:text-ink"
        >
          Open
        </Link>
      )}
    </div>
  );
}
