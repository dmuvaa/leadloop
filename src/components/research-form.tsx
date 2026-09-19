"use client";

import { useEffect, useState } from "react";
import { SellerReview } from "@/components/seller-review";
import { Button, Field, Icon, SectionLabel, compactInputClass, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Brief, SellerProfile } from "@/lib/schemas";
import { cn, normalizeWebsite } from "@/lib/utils";

type Step = "website" | "brief";

const emptyBrief = (): Brief => ({
  offer: "",
  icp: "",
  location: "",
  count: 10,
  criteria: "",
  website: "",
  seeds: "",
  excludeDomains: [],
});

const EXAMPLE: Brief = {
  ...emptyBrief(),
  offer: "We build websites and AI automation systems for growing businesses.",
  icp: "Small and mid-sized accounting, dental and logistics companies with 10-100 employees.",
  criteria: "Prefer companies with outdated websites or poor online customer journeys.",
};

function startStep(initial?: Brief): Step {
  if (!initial) return "website";
  if (initial.seller) return "brief";
  if (initial.offer.trim().length >= 10 || initial.icp.trim().length >= 10) return "brief";
  return "website";
}

export function ResearchForm({ onSubmit, busy, initial }: { onSubmit: (b: Brief) => void; busy?: boolean; initial?: Brief }) {
  const { briefs, saveBrief, settings } = useStore();
  const [step, setStep] = useState<Step>(() => startStep(initial));
  const [form, setForm] = useState<Brief>(() => ({
    ...emptyBrief(),
    website: initial?.website || settings.website || "",
    ...initial,
  }));
  const [errors, setErrors] = useState<{ offer?: string; icp?: string; website?: string }>({});
  const [briefName, setBriefName] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [showSeeds, setShowSeeds] = useState(Boolean(initial?.seeds));
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const set = <K extends keyof Brief>(k: K, v: Brief[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!initial?.website && settings.website && !form.website) {
      set("website", settings.website);
    }
    // Only seed from workspace settings once the form is still empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.website]);

  const applySeller = (seller: SellerProfile) => {
    setForm((f) => ({
      ...f,
      website: seller.website,
      seller,
      offer: seller.offer || f.offer,
      icp: seller.icp || f.icp,
    }));
    setStep("brief");
  };

  const applyBrief = (next: Brief) => {
    setForm({ ...emptyBrief(), ...next, seeds: next.seeds ?? "", excludeDomains: [] });
    setShowSeeds(Boolean(next.seeds));
    setErrors({});
    setReadError(null);
    setStep("brief");
  };

  const goWebsite = () => {
    setStep("website");
    setReadError(null);
    setErrors((e) => ({ ...e, website: undefined }));
  };

  const skipWebsite = () => {
    setStep("brief");
    setReadError(null);
    setErrors((e) => ({ ...e, website: undefined }));
  };

  const readWebsite = async () => {
    const website = normalizeWebsite(form.website);
    if (!website) {
      setErrors((e) => ({ ...e, website: "Enter a valid website, like https://yourcompany.com." }));
      return;
    }
    setReading(true);
    setReadError(null);
    setErrors((e) => ({ ...e, website: undefined }));
    try {
      const res = await fetch("/api/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website,
          offer: form.offer.trim() || undefined,
          icp: form.icp.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not read that website.");
      applySeller(data.seller as SellerProfile);
    } catch (err) {
      setReadError(err instanceof Error ? err.message : "Could not read that website.");
    } finally {
      setReading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "website") {
      void readWebsite();
      return;
    }
    const next: typeof errors = {};
    const offer = (form.seller?.offer || form.offer).trim();
    const icp = (form.seller?.icp || form.icp).trim();
    if (offer.length < 10) next.offer = "Tell us a bit more about what you sell.";
    if (icp.length < 10) next.icp = "Describe who you want to sell to.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({
      ...form,
      offer,
      icp,
      location: form.location?.trim() ?? "",
      criteria: form.criteria?.trim() ?? "",
      website: normalizeWebsite(form.website) || form.seller?.website || "",
      seller: form.seller
        ? { ...form.seller, offer, icp, website: form.seller.website || normalizeWebsite(form.website) }
        : undefined,
      seeds: form.seeds?.trim() ?? "",
    });
  };

  const savedBriefSelect = briefs.length > 0 && (
    <Field label="Use a saved brief" optional>
      <select
        defaultValue=""
        onChange={(e) => {
          const b = briefs.find((x) => x.id === e.target.value);
          if (b) applyBrief(b.brief);
        }}
        className={cn(inputClass, "min-w-[240px]")}
      >
        <option value="">Choose a brief…</option>
        {briefs.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <form onSubmit={submit} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card md:p-6">
      {step === "website" ? (
        <div>
          <SectionLabel>Step 1 of 2</SectionLabel>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">Your website</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-500">
            We’ll read the site to learn what you provide and how outreach should sound. You can skip this and write the brief yourself.
          </p>

          <div className="mt-5">
            <Field label="Website" error={errors.website}>
              <input
                value={form.website ?? ""}
                onChange={(e) => {
                  setErrors((err) => ({ ...err, website: undefined }));
                  setReadError(null);
                  set("website", e.target.value);
                  if (form.seller && normalizeWebsite(e.target.value) !== form.seller.website) {
                    setForm((f) => ({ ...f, website: e.target.value, seller: undefined }));
                  }
                }}
                placeholder="https://yourcompany.com"
                autoComplete="url"
                inputMode="url"
                className={inputClass}
              />
            </Field>
            {reading && (
              <p className="mt-2 text-sm text-zinc-500">Reading your site — services, who you sell to, and how you sound…</p>
            )}
            {readError && <p className="mt-2 text-sm text-red-600">{readError}</p>}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" loading={reading} disabled={reading}>
              <Icon name="search" /> Read website
            </Button>
            <button
              type="button"
              onClick={skipWebsite}
              disabled={reading}
              className="text-sm font-medium text-zinc-600 hover:text-ink disabled:text-zinc-400"
            >
              Skip — I’ll enter this myself
            </button>
          </div>

          <div className="mt-8 space-y-4 border-t border-zinc-100 pt-5">
            <button
              type="button"
              onClick={() => applyBrief(EXAMPLE)}
              className="text-sm text-zinc-500 underline-offset-4 hover:text-ink hover:underline"
            >
              Use an example brief
            </button>
            {savedBriefSelect}
          </div>
        </div>
      ) : (
        <div>
          {savedBriefSelect && <div className="mb-5 border-b border-zinc-100 pb-5">{savedBriefSelect}</div>}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionLabel>Step 2 of 2</SectionLabel>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">
                {form.seller ? "Review your brief" : "Your brief"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {form.seller
                  ? "Edit anything that looks off, then find opportunities."
                  : "Tell us what you sell and who you want to reach."}
              </p>
            </div>
            <button
              type="button"
              onClick={goWebsite}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-ink"
            >
              <Icon name="arrow-left" /> Start with a website
            </button>
          </div>

          {form.seller ? (
            <div className="mb-5">
              <SellerReview
                seller={form.seller}
                onChange={(seller) => {
                  setForm((f) => ({ ...f, seller, offer: seller.offer, icp: seller.icp, website: seller.website }));
                  setErrors({});
                }}
              />
            </div>
          ) : (
            <div className="mb-5 grid gap-5 md:grid-cols-2">
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
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
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

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowSeeds((v) => !v)}
              className="text-sm font-medium text-zinc-600 hover:text-ink"
            >
              {showSeeds ? "Hide company list" : "Research a specific list instead"}
            </button>
            {showSeeds && (
              <div className="mt-3">
                <Field label="Seed companies" optional hint="Names, domains, or a small CSV">
                  <textarea
                    rows={4}
                    value={form.seeds ?? ""}
                    onChange={(e) => set("seeds", e.target.value)}
                    placeholder={"acme.com\nNorthwind Dental\nhttps://contoso.co.uk"}
                    className={cn(inputClass, "font-mono text-[13px]")}
                  />
                </Field>
                <p className="mt-1.5 text-xs text-zinc-500">
                  LeadLoop will research these companies against your offer instead of discovering new ones.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {!form.seller && (
                <button
                  type="button"
                  onClick={() => applyBrief(EXAMPLE)}
                  className="text-sm text-zinc-500 underline-offset-4 hover:text-ink hover:underline"
                >
                  Use an example brief
                </button>
              )}
              <div className="hidden items-center gap-2 sm:flex">
                <input
                  value={briefName}
                  onChange={(e) => setBriefName(e.target.value)}
                  placeholder="Save as brief…"
                  className={cn(compactInputClass, "h-8 w-40 text-[13px]")}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const offer = (form.seller?.offer || form.offer).trim();
                    const icp = (form.seller?.icp || form.icp).trim();
                    const n = briefName.trim();
                    if (!n || offer.length < 10 || icp.length < 10) return;
                    saveBrief(n, {
                      ...form,
                      offer,
                      icp,
                      website: normalizeWebsite(form.website) || form.seller?.website || "",
                    });
                    setBriefName("");
                    setSavedMsg("Brief saved");
                    setTimeout(() => setSavedMsg(null), 1600);
                  }}
                >
                  Save
                </Button>
                {savedMsg && <span className="text-xs text-brand-700">{savedMsg}</span>}
              </div>
            </div>
            <Button type="submit" size="lg" loading={busy}>
              <Icon name="search" />
              Find Opportunities
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
