"use client";

import { STAGES, type StageId, type StageStatus } from "@/lib/schemas";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

export type StageState = Record<StageId, { status: StageStatus; detail?: string }>;

export const initialStages = (): StageState =>
  Object.fromEntries(STAGES.map((s) => [s.id, { status: "waiting" }])) as StageState;

export function ResearchProgress({ stages, providerName }: { stages: StageState; providerName?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Research in progress</div>
        {providerName && (
          <div className="text-xs text-zinc-500">{providerName}</div>
        )}
      </div>
      <ol className="mt-4 space-y-1">
        {STAGES.map((s, i) => {
          const st = stages[s.id];
          return (
            <li key={s.id} className="relative flex items-start gap-3 py-2">
              {i < STAGES.length - 1 && (
                <span
                  className={cn(
                    "absolute left-[9px] top-[26px] h-[calc(100%-14px)] w-px",
                    st.status === "done" ? "bg-brand-500" : "bg-zinc-200"
                  )}
                />
              )}
              <StageDot status={st.status} />
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm", st.status === "waiting" ? "text-zinc-400" : "font-medium text-ink")}>{s.label}</div>
                <div className="text-xs text-zinc-500">
                  {st.status === "done" && (st.detail ?? "Done")}
                  {st.status === "active" && (st.detail ?? "In progress")}
                  {st.status === "waiting" && "Waiting"}
                  {st.status === "error" && (st.detail ?? "Failed")}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageDot({ status }: { status: StageStatus }) {
  if (status === "done")
    return (
      <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
        <Icon name="check" className="size-3" />
      </span>
    );
  if (status === "active")
    return (
      <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-brand-600">
        <span className="size-2 rounded-full bg-brand-600 animate-pulse-dot" />
      </span>
    );
  if (status === "error")
    return <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 text-white"><Icon name="x" className="size-3" /></span>;
  return <span className="mt-0.5 size-[18px] shrink-0 rounded-full border-2 border-zinc-200 bg-white" />;
}
