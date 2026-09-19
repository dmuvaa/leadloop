import Link from "next/link";
import { ButtonLink, Icon, Logo, Score, Badge, StatusBadge } from "@/components/ui";

const steps = [
  { title: "Your offer", text: "What you sell, in a sentence." },
  { title: "Ideal customer", text: "The B2B accounts you want as leads." },
  { title: "Find companies", text: "Live search, not a stale list." },
  { title: "Qualify the lead", text: "Fit, evidence, and why now." },
  { title: "Outreach email", text: "A first message built on the research." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="LeadLoop home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-zinc-600 md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#why" className="hover:text-ink">Why LeadLoop</a>
            <Link href="/app" className="hover:text-ink">Product</Link>
          </nav>
          <ButtonLink href="/app/find" size="sm">
            Find B2B leads
          </ButtonLink>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl overflow-x-clip px-5 pb-16 pt-20 md:pb-24 md:pt-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Badge tone="brand" className="mb-5">B2B lead generation</Badge>
            <h1 className="text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.035em] md:text-6xl">
              Find B2B leads.
              <br />
              Reach out with a reason.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-600">
              Most sales teams buy a list and send a template. LeadLoop finds companies that match who you sell to,
              researches each one, and drafts the first email from what is actually on their site.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/app/find" size="lg">
                Find B2B leads
                <Icon name="arrow-right" />
              </ButtonLink>
              <a
                href="#how"
                className="inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[15px] font-medium text-zinc-700 hover:bg-zinc-50"
              >
                See how it works
              </a>
            </div>
            <p className="mt-6 text-sm text-zinc-500">
              Every claim is <span className="font-medium text-zinc-700">verified</span>,{" "}
              <span className="font-medium text-zinc-700">inferred</span>, or{" "}
              <span className="font-medium text-zinc-700">unknown</span>. Outreach never invents a fact.
            </p>
          </div>

          {/* Structural preview of a prospect record (no company data) */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_top_left,_#ecfdf5,_transparent_60%)]" />
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-pop ring-1 ring-black/2" aria-hidden>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-zinc-200" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-36 rounded bg-zinc-200" />
                    <div className="h-2.5 w-24 rounded bg-zinc-100" />
                  </div>
                </div>
                <Badge tone="outline">B2B lead</Badge>
              </div>
              <div className="mt-5 flex gap-6">
                <Score label="ICP fit" value={0} />
                <Score label="Opportunity" value={0} />
              </div>
              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Why this lead</div>
                  <div className="mt-2 space-y-1.5">
                    <div className="h-2.5 w-full rounded bg-zinc-100" />
                    <div className="h-2.5 w-5/6 rounded bg-zinc-100" />
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    <Icon name="clock" className="size-3.5" /> Why now
                  </div>
                  <div className="mt-2 h-2.5 w-3/4 rounded bg-zinc-200" />
                  <div className="mt-2 flex gap-1.5">
                    <StatusBadge status="verified" />
                    <StatusBadge status="inferred" />
                    <StatusBadge status="unknown" />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Outreach angle</div>
                  <div className="mt-2 h-2.5 w-2/3 rounded bg-zinc-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="how" className="border-y border-zinc-100 bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight">From brief to outbound, in one loop.</h2>
            <p className="mt-3 text-zinc-600">
              Describe the offer. LeadLoop finds matching companies, scores each lead, and prepares outreach you
              approve before anything is sent.
            </p>
          </div>
          <ol className="mt-12 grid gap-4 md:grid-cols-5">
            {steps.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
                <div className="flex size-7 items-center justify-center rounded-md bg-ink text-xs font-semibold text-white">
                  {i + 1}
                </div>
                <div className="mt-4 font-semibold">{s.title}</div>
                <p className="mt-1 text-sm text-zinc-600">{s.text}</p>
                {i < steps.length - 1 && (
                  <div className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-zinc-300 md:block">
                    <Icon name="arrow-right" className="size-4" />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { title: "Inbox", text: "Review new leads. Keep the fits, skip the rest." },
            { title: "Lists", text: "Build the account list you will work this week." },
            { title: "Campaigns", text: "Batch outreach from a list or search. Sending stays manual." },
            { title: "Queue", text: "Approve the recipient, then send the first email from Gmail." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
              <div className="text-sm font-semibold">{item.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Positioning */}
      <section id="why" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-semibold tracking-tight">Not another email generator.</h2>
        <p className="mt-3 max-w-xl text-zinc-600">
          B2B teams do not struggle to write. They struggle to know which company is a lead, and why that company
          should take the meeting.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: "search" as const, title: "Find leads", text: "Companies that match your ICP, discovered live from the web — not a bought list." },
            { icon: "sparkle" as const, title: "Qualify", text: "A scored reason to contact them, with sources. Honest about what was seen and what was inferred." },
            { icon: "send" as const, title: "Outreach", text: "A first email from verified observations. Multiple angles, one clear ask, no fake familiarity." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-card">
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon name={c.icon} />
              </div>
              <div className="mt-4 text-lg font-semibold">{c.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Run your next outbound list here.</h2>
            <p className="mt-2 text-zinc-600">Enter what you sell and who you sell to. Get researched B2B leads and a first email for each.</p>
          </div>
          <ButtonLink href="/app/find" size="lg">
            Find B2B leads
            <Icon name="arrow-right" />
          </ButtonLink>
        </div>
        <footer className="border-t border-zinc-100">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 text-xs text-zinc-500">
            <Logo className="text-sm" />
            <span>B2B lead generation and outreach.</span>
          </div>
        </footer>
      </section>
    </div>
  );
}
