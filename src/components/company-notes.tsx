"use client";

import { useState } from "react";
import { Button, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CompanyNotes({ prospectId, notes }: { prospectId: string; notes?: string }) {
  const { setNotes } = useStore();
  const [value, setValue] = useState(notes ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setNotes(prospectId, value);
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Private notes about this company — next step, objection, intro path."
        className={cn(inputClass, "resize-y")}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" size="sm">
          Save notes
        </Button>
        {saved && <span className="text-xs text-brand-700">Saved</span>}
      </div>
    </form>
  );
}
