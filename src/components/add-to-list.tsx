"use client";

import { useState } from "react";
import { Button, compactInputClass } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AddToList({ prospectId, compact }: { prospectId: string; compact?: boolean }) {
  const { lists, createList, addToList } = useStore();
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const apply = (id: string) => {
    addToList(id, prospectId);
    setMessage("Saved to list");
    setTimeout(() => setMessage(null), 1600);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "text-sm")}>
      {lists.length > 0 ? (
        <>
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className={cn(compactInputClass, "h-8 text-[13px]")}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => listId && apply(listId)} disabled={!listId}>
            Save to list
          </Button>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New list name"
            className={cn(compactInputClass, "h-8 w-40 text-[13px]")}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const n = name.trim();
              if (!n) return;
              const list = createList(n);
              setListId(list.id);
              setName("");
              apply(list.id);
            }}
          >
            Create list
          </Button>
        </div>
      )}
      {lists.length > 0 && (
        <details className="text-xs text-zinc-500">
          <summary className="cursor-pointer hover:text-ink">New list</summary>
          <div className="mt-2 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="List name"
              className={cn(compactInputClass, "h-8 w-40 text-[13px]")}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const n = name.trim();
                if (!n) return;
                const list = createList(n);
                setListId(list.id);
                setName("");
                apply(list.id);
              }}
            >
              Create
            </Button>
          </div>
        </details>
      )}
      {message && <span className="text-xs text-brand-700">{message}</span>}
    </div>
  );
}
