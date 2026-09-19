"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ButtonLink, Icon, Logo, type IconName } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const groups: { label: string; items: { href: string; label: string; icon: IconName; exact?: boolean; count?: "inbox" | "prospects" | "queue" | "lists" | "campaigns" }[] }[] = [
  {
    label: "Work",
    items: [
      { href: "/app", label: "Dashboard", icon: "grid", exact: true },
      { href: "/app/find", label: "Find leads", icon: "search" },
      { href: "/app/inbox", label: "Inbox", icon: "inbox", count: "inbox" },
      { href: "/app/prospects", label: "Prospects", icon: "building", count: "prospects" },
      { href: "/app/queue", label: "Outreach queue", icon: "send", count: "queue" },
    ],
  },
  {
    label: "Organize",
    items: [
      { href: "/app/briefs", label: "Saved briefs", icon: "file" },
      { href: "/app/lists", label: "Lists", icon: "folder", count: "lists" },
      { href: "/app/campaigns", label: "Campaigns", icon: "megaphone", count: "campaigns" },
      { href: "/app/searches", label: "History", icon: "history" },
    ],
  },
  {
    label: "Setup",
    items: [{ href: "/app/settings", label: "Settings", icon: "settings" }],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { stats, hydrated, settings, lists, campaigns } = useStore();
  const [open, setOpen] = useState(false);

  const counts = useMemo(
    () => ({
      inbox: stats.inbox,
      prospects: stats.researched,
      queue: stats.queued,
      lists: lists.length,
      campaigns: campaigns.length,
    }),
    [stats, lists.length, campaigns.length]
  );

  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  const title = useMemo(() => {
    const flat = groups.flatMap((g) => g.items);
    return flat.find((item) => isActive(item))?.label ?? "LeadLoop";
  }, [pathname]);

  const nav = (
    <>
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" aria-label="LeadLoop home" onClick={() => setOpen(false)}>
          <Logo className="text-white" />
        </Link>
        <button
          type="button"
          className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <Icon name="x" />
        </button>
      </div>

      <div className="px-3">
        <ButtonLink href="/app/find" className="w-full bg-brand-600 text-white shadow-none hover:bg-brand-500">
          <Icon name="sparkle" /> Find leads
        </ButtonLink>
      </div>

      <nav className="mt-5 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">{group.label}</div>
            <div className="mt-1.5 space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const count = item.count ? counts[item.count] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
                    )}
                  >
                    <Icon name={item.icon} className={cn("size-4", active ? "text-white" : "text-white/45")} />
                    <span className="flex-1">{item.label}</span>
                    {hydrated && count > 0 && <span className="tabular text-xs text-white/40">{count}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="text-sm font-medium text-white">{settings.name || "My workspace"}</div>
        <div className="mt-0.5 text-xs text-white/45">Research → Opportunity → Outreach</div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {open && (
        <button type="button" className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "flex h-screen w-64 flex-col bg-sidebar text-white lg:sticky lg:top-0 lg:h-screen lg:w-full",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:transition-transform",
          open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
        )}
      >
        {nav}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/90 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-ink lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
            <div className="truncate text-sm font-medium text-zinc-600">{title}</div>
          </div>
          <ButtonLink href="/app/find" size="sm" className="hidden sm:inline-flex">
            <Icon name="search" className="size-3.5" /> New search
          </ButtonLink>
        </header>
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
