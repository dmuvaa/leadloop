"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink, Card, EmptyState, Field, Icon, PageHeader, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function ListsPage() {
  const { lists, createList, hydrated } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div>
      <PageHeader
        kicker="Organize"
        title="Lists"
        description="Named groups of B2B leads. Start a campaign from a list when you are ready to outreach."
        action={<ButtonLink href="/app/prospects">Browse prospects</ButtonLink>}
      />

      <form
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          createList(name.trim(), description.trim());
          setName("");
          setDescription("");
        }}
      >
        <Field label="New list">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="UK accounting firms" className={inputClass} required />
        </Field>
        <Field label="Description" optional>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className={inputClass} />
        </Field>
        <Button type="submit">
          <Icon name="plus" /> Create
        </Button>
      </form>

      {!hydrated ? (
        <div className="skeleton mt-6 h-40 rounded-2xl" />
      ) : lists.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Icon name="folder" className="size-6" />}
            title="No lists"
            description="Save qualified leads into named lists before exporting or starting a campaign."
            action={<ButtonLink href="/app/prospects">Browse prospects</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {lists.map((list) => (
            <li key={list.id}>
              <Link href={`/app/lists/${list.id}`} className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-card transition-colors hover:border-brand-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{list.name}</h2>
                    {list.description && <p className="mt-1 text-sm text-zinc-500">{list.description}</p>}
                  </div>
                  <span className="tabular text-sm text-zinc-500">{list.prospectIds.length} companies</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
