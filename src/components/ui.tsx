"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn, initials, scoreTone } from "@/lib/utils";
import type { EvidenceStatus, ProspectStatus } from "@/lib/schemas";
import { STATUS_LABEL } from "@/lib/schemas";

/* ---------- Button ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-zinc-800 disabled:bg-zinc-300 shadow-sm",
  secondary: "bg-white text-ink border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 disabled:text-zinc-400",
  ghost: "text-zinc-700 hover:bg-zinc-100 disabled:text-zinc-400",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
};
const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  md: "h-9.5 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-lg",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }
>(function Button({ className, variant = "primary", size = "md", loading, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors select-none whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...rest}
    >
      {loading && <Spinner className="size-3.5" />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  className,
  variant = "primary",
  size = "md",
  children,
}: {
  href: string;
  className?: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors select-none whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        variantClass[variant],
        sizeClass[size],
        className
      )}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Card ---------- */

export function Card({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return <div id={id} className={cn("rounded-2xl border border-zinc-200 bg-white shadow-card", className)}>{children}</div>;
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500", className)}>{children}</div>
  );
}

/* ---------- Badges ---------- */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "amber" | "blue" | "red" | "outline";
  className?: string;
}) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-700",
    brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/70",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/70",
    blue: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200/70",
    red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/70",
    outline: "bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4", tones[tone], className)}>
      {children}
    </span>
  );
}

const statusMeta: Record<EvidenceStatus, { label: string; tone: "brand" | "blue" | "amber" | "neutral" }> = {
  verified: { label: "Verified", tone: "brand" },
  inferred: { label: "Inferred", tone: "blue" },
  potential: { label: "Potential", tone: "amber" },
  unknown: { label: "Unknown", tone: "neutral" },
};

export function StatusBadge({ status }: { status: EvidenceStatus }) {
  const m = statusMeta[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

const prospectTone: Record<ProspectStatus, "neutral" | "brand" | "amber" | "blue" | "red" | "outline"> = {
  inbox: "blue",
  kept: "brand",
  skipped: "neutral",
  queued: "amber",
  sent: "brand",
};

export function ProspectStatusBadge({ status }: { status: ProspectStatus }) {
  return <Badge tone={prospectTone[status]}>{STATUS_LABEL[status]}</Badge>;
}

/* ---------- Scores ---------- */

export function Score({ value, label, size = "md" }: { value: number; label: string; size?: "sm" | "md" | "lg" }) {
  const tone = scoreTone(value);
  const color = tone === "high" ? "text-brand-700" : tone === "mid" ? "text-amber-700" : "text-zinc-600";
  const bar = tone === "high" ? "bg-brand-500" : tone === "mid" ? "bg-amber-500" : "bg-zinc-400";
  return (
    <div className={cn("min-w-0", size === "lg" ? "w-48" : size === "md" ? "w-32" : "w-28")}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">{label}</span>
        <span className={cn("tabular font-semibold leading-none", size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-base", color)}>
          {value}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
        <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/* ---------- Avatar ---------- */

const palette = ["bg-zinc-800", "bg-brand-700", "bg-slate-700", "bg-stone-700", "bg-teal-800", "bg-emerald-800"];

export function CompanyMark({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  const dims = size === "lg" ? "size-14 text-lg rounded-xl" : size === "md" ? "size-10 text-sm rounded-lg" : "size-8 text-xs rounded-md";
  return (
    <div className={cn("flex shrink-0 items-center justify-center font-semibold text-white tracking-tight", palette[idx], dims)}>
      {initials(name)}
    </div>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center shadow-card">
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400 ring-1 ring-zinc-200">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">{kicker}</div>}
        <h1 className={cn("font-semibold tracking-tight text-ink", kicker ? "mt-1 text-2xl md:text-[1.75rem]" : "text-2xl md:text-[1.75rem]")}>
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/* ---------- Misc ---------- */

export function Field({
  label,
  hint,
  optional,
  children,
  error,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">
          {label}
          {optional && <span className="ml-1.5 text-xs font-normal text-zinc-400">Optional</span>}
        </span>
        {hint && <span className="text-xs text-zinc-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-zinc-400 shadow-[inset_0_1px_1px_rgb(0_0_0/0.02)] transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15";

export const compactInputClass =
  "rounded-lg border border-zinc-200 bg-white px-3 text-sm text-ink placeholder:text-zinc-400 transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15";

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-ink", className)}>
      <span className={cn("relative flex size-6 items-center justify-center rounded-md bg-ink", markClassName)}>
        <span className="absolute size-3 rounded-full border-[2.5px] border-white" />
        <span className="absolute size-1.5 translate-x-1 translate-y-1 rounded-full bg-brand-500 ring-2 ring-current" />
      </span>
      LeadLoop
    </span>
  );
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const c = cn("size-4", className);
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", className: c, "aria-hidden": true };
  switch (name) {
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case "grid":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "list":
      return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></svg>;
    case "send":
      return <svg {...common}><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4Z" /></svg>;
    case "bookmark":
      return <svg {...common}><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" /></svg>;
    case "bookmark-filled":
      return <svg {...common} fill="currentColor"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 5 5L20 7" /></svg>;
    case "copy":
      return <svg {...common}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>;
    case "refresh":
      return <svg {...common}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></svg>;
    case "external":
      return <svg {...common}><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" /></svg>;
    case "arrow-right":
      return <svg {...common}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
    case "arrow-left":
      return <svg {...common}><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "sparkle":
      return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></svg>;
    case "mail":
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
    case "x":
      return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "filter":
      return <svg {...common}><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" /></svg>;
    case "pin":
      return <svg {...common}><path d="M12 21s-6-5.3-6-11a6 6 0 1 1 12 0c0 5.7-6 11-6 11Z" /><circle cx="12" cy="10" r="2" /></svg>;
    case "building":
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" /></svg>;
    case "trash":
      return <svg {...common}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
    case "alert":
      return <svg {...common}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>;
    case "inbox":
      return <svg {...common}><path d="M4 6h16v12H4z" /><path d="M4 13h4l2 3h4l2-3h4" /></svg>;
    case "history":
      return <svg {...common}><path d="M4 13a8 8 0 1 0 2.3-5.6" /><path d="M4 5v4h4" /><path d="M12 8v5l3 2" /></svg>;
    case "megaphone":
      return <svg {...common}><path d="M4 10v4l12 5V5L4 10Z" /><path d="M16 9.5v5" /><path d="M7 14.2V19a2 2 0 0 0 2.4 2l1.6-.4" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>;
    case "download":
      return <svg {...common}><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></svg>;
    case "folder":
      return <svg {...common}><path d="M3 7h6l2 2h10v10H3z" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "table":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10M15 10v10" /></svg>;
    case "users":
      return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 19a6 6 0 0 1 12 0" /><circle cx="17" cy="9" r="2.5" /><path d="M17 19a5 5 0 0 0-3-4.5" /></svg>;
    case "file":
      return <svg {...common}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>;
    case "slash":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M6 18 18 6" /></svg>;
  }
}
export type IconName =
  | "search" | "grid" | "list" | "send" | "bookmark" | "bookmark-filled" | "check" | "copy" | "refresh" | "external"
  | "arrow-right" | "arrow-left" | "clock" | "sparkle" | "mail" | "x" | "plus" | "filter" | "pin" | "building" | "trash" | "alert"
  | "inbox" | "history" | "megaphone" | "settings" | "download" | "folder" | "menu" | "table" | "users" | "file" | "slash";
