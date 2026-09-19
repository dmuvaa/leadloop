"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, Logo, type IconName } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const nav: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/app", label: "Dashboard", icon: "grid", exact: true },
  { href: "/app/find", label: "Find opportunities", icon: "search" },
  { href: "/app/prospects", label: "Prospects", icon: "building" },
  { href: "/app/queue", label: "Outreach queue", icon: "send" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { stats, hydrated } = useStore();

  const isActive = (item: (typeof nav)[number]) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      {/* Sidebar */}
      <aside className="hidden border-r border-zinc-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <div className="flex h-14 items-center px-5">
          <Link href="/" aria-label="LeadLoop home">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 pt-2">
          {nav.map((item) => {
            const active = isActive(item);
            const count = item.href === "/app/queue" ? stats.queued : item.href === "/app/prospects" ? stats.researched : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  active ? "bg-zinc-100 text-ink" : "text-zinc-600 hover:bg-zinc-50 hover:text-ink"
                )}
              >
                <Icon name={item.icon} className={cn("size-4", active ? "text-ink" : "text-zinc-400")} />
                <span className="flex-1">{item.label}</span>
                {hydrated && count > 0 && <span className="tabular text-xs text-zinc-400">{count}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-100 p-4 text-xs text-zinc-500">
          <div className="font-medium text-zinc-700">Find the reason to reach out.</div>
          <div className="mt-1">Research → Opportunity → Outreach</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden">
        <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" aria-label="LeadLoop home">
              <Logo />
            </Link>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
                  isActive(item) ? "bg-zinc-100 text-ink" : "text-zinc-600"
                )}
              >
                <Icon name={item.icon} className="size-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <main className="min-w-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
