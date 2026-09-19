"use client";

import { Badge, Field, Icon, SectionLabel, inputClass } from "@/components/ui";
import type { SellerProfile } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function SellerReview({
  seller,
  onChange,
}: {
  seller: SellerProfile;
  onChange: (next: SellerProfile) => void;
}) {
  const set = <K extends keyof SellerProfile>(key: K, value: SellerProfile[K]) => onChange({ ...seller, [key]: value });
  const setOutreach = <K extends keyof SellerProfile["outreach"]>(key: K, value: SellerProfile["outreach"][K]) =>
    onChange({ ...seller, outreach: { ...seller.outreach, [key]: value } });

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel className="text-brand-800">Reviewed from your website</SectionLabel>
          <p className="mt-1 text-sm text-zinc-600">
            Edit anything that looks off. Research and emails will use this.
          </p>
        </div>
        <Badge tone={seller.confidence === "high" ? "brand" : seller.confidence === "medium" ? "amber" : "neutral"}>
          {seller.confidence} confidence
        </Badge>
      </div>

      <p className="mt-3 text-sm text-zinc-700">
        <span className="font-medium">{seller.companyName || "Your company"}</span>
        <span className="text-zinc-400"> · </span>
        <a href={seller.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
          {seller.website.replace(/^https?:\/\//, "")} <Icon name="external" className="size-3" />
        </a>
      </p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{seller.observations}</p>

      {seller.services.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {seller.services.map((s) => (
            <span key={s} className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 ring-1 ring-zinc-200">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="What you sell">
          <textarea
            rows={3}
            value={seller.offer}
            onChange={(e) => set("offer", e.target.value)}
            className={cn(inputClass, "resize-none bg-white")}
          />
        </Field>
        <Field label="Who you sell to">
          <textarea
            rows={3}
            value={seller.icp}
            onChange={(e) => set("icp", e.target.value)}
            className={cn(inputClass, "resize-none bg-white")}
          />
        </Field>
        <Field label="Outreach tone">
          <input value={seller.outreach.tone} onChange={(e) => setOutreach("tone", e.target.value)} className={cn(inputClass, "bg-white")} />
        </Field>
        <Field label="Call to action">
          <input value={seller.outreach.cta} onChange={(e) => setOutreach("cta", e.target.value)} className={cn(inputClass, "bg-white")} />
        </Field>
        <Field label="How the first email should sound">
          <textarea
            rows={2}
            value={seller.outreach.voice}
            onChange={(e) => setOutreach("voice", e.target.value)}
            className={cn(inputClass, "resize-none bg-white")}
          />
        </Field>
        <Field label="How you pitch">
          <textarea
            rows={2}
            value={seller.outreach.pitch}
            onChange={(e) => setOutreach("pitch", e.target.value)}
            className={cn(inputClass, "resize-none bg-white")}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Do not say">
          <input value={seller.outreach.avoid} onChange={(e) => setOutreach("avoid", e.target.value)} className={cn(inputClass, "bg-white")} />
        </Field>
      </div>
    </div>
  );
}
