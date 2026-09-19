# LeadLoop

**Find the reason to reach out.**

LeadLoop is an AI opportunity finder. You describe what you sell and who you want to sell to. It researches companies, scores ICP fit and opportunity, labels every claim as verified / inferred / potential / unknown, explains *why now*, and drafts a first email built on the research.

## Run

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude access for research, scoring and email generation |
| `ANTHROPIC_WORKSPACE_ID` | If key is not workspace-scoped | Sent as the `anthropic-workspace-id` header |
| `LEADLOOP_MODEL` | No | Model for analysis and writing (default `claude-fable-5-1`) |
| `LEADLOOP_RESEARCH_MODEL` | No | Model for web-search research steps (default: same as above) |

Companies are found and researched live via Claude web search. Every evidence item carries a source URL and a status of verified, inferred, potential or unknown.

## Sending through Gmail (optional)

LeadLoop looks for a public contact during research: the company's contact/about/team pages first, then LinkedIn or directories for an owner or managing partner. Only addresses seen verbatim on a page are marked verified, and only verified addresses are auto-filled as the recipient (a named person beats a generic inbox). Anything else is labelled inferred and never auto-used. Use **Find contact** on a prospect to retry.

LeadLoop can send approved emails from your Gmail account over SMTP. There is no unattended sending: each email needs a recipient you enter and an explicit approval, then you click Send or "Send all approved".

1. Turn on 2-step verification for the Google account.
2. Create an App Password at https://myaccount.google.com/apppasswords.
3. Add to `.env.local` and restart:

```
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
SENDER_NAME=Your Name
SENDER_SIGNATURE=Your Company · Street, City · Reply "unsubscribe" to opt out
SEND_DAILY_CAP=20
```

`SENDER_NAME` replaces "[Your name]" in drafts, and "Hi there," becomes "Hi <first name>," when a recipient name is given. `SENDER_SIGNATURE` is appended to every sent email. The daily cap is a safety limit; start low, since cold volume from a fresh account gets flagged quickly.

- `src/lib/mailer.ts` — Gmail SMTP via Nodemailer, daily cap, body finalisation
- `src/app/api/send/route.ts` — send status and send endpoint
- `src/app/api/contact/route.ts` — on-demand contact discovery

## Architecture

```
Brief → analyzeOffer → findCandidates → researchProspect → analyzeOpportunity → findContact → generateEmail
```

- `src/lib/ai/provider.ts` — `AIProvider` interface (swap models without touching UI)
- `src/lib/ai/anthropic.ts` — Claude Fable 5.1 implementation (web search, Zod structured outputs, server-side refusal fallbacks)
- `src/lib/pipeline.ts` — agent pipeline; emits typed progress events
- `src/app/api/research/route.ts` — NDJSON streaming endpoint
- `src/app/api/email/route.ts` — email generation endpoint
- `src/lib/store.tsx` — localStorage persistence (searches, prospects, queue)
