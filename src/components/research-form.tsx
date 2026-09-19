"use client";

import { useState } from "react";
import { Button, Field, Icon, inputClass } from "@/components/ui";
import type { Brief } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const EXAMPLE: Brief = {
  offer: "We build websites and AI automation systems for growing businesses.",
  icp: "Small and mid-sized accounting, dental and logistics companies with 10-100 employees.",
  location: "",
  count: 10,
  criteria: "Prefer companies with outdated websites or poor online customer journeys.",
};

export function ResearchForm({ onSubmit, busy, initial }: { onSubmit: (b: Brief) => void; busy?: boolean; initial?: Brief }) {
  const [form, setForm] = useState<Brief>(initial ?? { offer: "", icp: "", location: "", count: 10, criteria: "" });
  const [errors, setErrors] = useState<{ offer?: string; icp?: string }>({});

  const set = <K extends keyof Brief>(k: K, v: Brief[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (form.offer.trim().length < 10) next.offer = "Tell us a bit more about what you sell.";
    if (form.icp.trim().length < 10) next.icp = "Describe who you want to sell to.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({ ...form, offer: form.offer.trim(), icp: form.icp.trim(), location: form.location?.trim() ?? "", criteria: form.criteria?.trim() ?? "" });
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-card md:p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="What do you sell?" error={errors.offer}>
          <textarea
            rows={3}
            value={form.offer}
            onChange={(e) => set("offer", e.target.value)}
            placeholder="We build websites and AI automation systems for growing businesses."
            className={cn(inputClass, "resize-none")}
          />
        </Field>
        <Field label="Who do you want to sell to?" error={errors.icp}>
          <textarea
            rows={3}
            value={form.icp}
            onChange={(e) => set("icp", e.target.value)}
            placeholder="Small and mid-sized accounting firms in the United States."
            className={cn(inputClass, "resize-none")}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
          <Field label="Location" optional>
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Chicago, Kenya, United Kingdom"
              className={inputClass}
            />
          </Field>
          <Field label="Prospects">
            <select value={form.count} onChange={(e) => set("count", Number(e.target.value) as Brief["count"])} className={inputClass}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </Field>
        </div>
        <Field label="Additional criteria" optional>
          <input
            value={form.criteria}
            onChange={(e) => set("criteria", e.target.value)}
            placeholder="Prefer companies with outdated websites or poor online customer journeys."
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setForm(EXAMPLE);
            setErrors({});
          }}
          className="text-sm text-zinc-500 underline-offset-4 hover:text-ink hover:underline"
        >
          Use an example brief
        </button>
        <Button type="submit" size="lg" loading={busy}>
          <Icon name="search" />
          Find Opportunities
        </Button>
      </div>
    </form>
  );
}
