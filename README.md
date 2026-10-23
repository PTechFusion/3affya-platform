# 3affya platform

US-trained, Arabic-speaking doctors for patients in the Gulf. Launch build (19 Oct to 4 Dec 2026) by ProgrammX for Dr Ayman.

This repo is preloaded so Claude Code can take over: the scaffold (task 1.1), the brand system (task 1.2), a brief for every one of the 50 screens, the research-backed screen rules, the handoff documents, and synthetic sample data.

## How to begin

**1. Run it (5 minutes)**

```bash
git clone https://github.com/PTechFusion/3affya-platform.git
cd 3affya-platform
npm install
npm run dev
```

Open http://localhost:3000. It redirects to `/ar`. Then open `/ar/brand` and `/en/brand`: that page is the whole design system, every colour, type size and component, in both directions. Everything else gets built from it.

**2. Open Claude Code in the folder**

```bash
claude
```

It reads `CLAUDE.md` on start, which tells it where the briefs, rules and tokens are and how the build loop works. You do not need to explain the project.

**3. Build the first screen**

Say:

> Build screen 1 from docs/screens/01-home.md. Both locales, sample data from data/sample, shared components only. When done, run npm run check, then build and screenshot it with npm run screens and show me the four PNGs.

Look at the screenshots at 390 px and 1280 px, in Arabic and English. Compare with the layout call at the top of the brief. Say what is off in one or two specific sentences ("too much space under the hero, tighten to 24 px; the price goes above the languages"). Two or three passes is normal.

**4. Continue down the list**

`docs/screens/README.md` is the index. The order for this week (task 1.6 then 1.7):

- 1 Home, 4 Specialty directory, 5 Search results, 7 Doctor profile verified, 6 Doctor profile unclaimed
- 2 Why US training, 3 How it works, 13 FAQ, 14 About, 15 Contact, 11 AI tools, 12 For professionals, 17 404
- 28 Profile builder (clickable flow with the live card), then the portal shells: 21 Bookings list, 31 Introduction inbox, 39 Credential review queue, with navigation and empty states

Commit after each screen with the task id: `git commit -m "M1.6 home page"`.

**5. Friday: deploy and send the link**

Task 1.11 in `docs/handoff/programmx_handoff-tasks_2026-10.md`. Dr Ayman reviews on phone and desktop in both languages and approves in writing.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run check` | Lint (fails on physical CSS like `ml-4`), type check, i18n key check |
| `npm run build && npm run start` | Production build and server |
| `npm run screens` | Screenshots of every route in both locales at 390 and 1280 px, with an overflow warning |
| `npm run i18n:check` | Same key set in `ar.json` and `en.json`; counts Arabic keys still needing Dr Ayman's review |

## What is where

```
app/[locale]/           routes; /ar is default, /en secondary; dir set on <html>
app/[locale]/brand      the design system page (task 1.2)
app/globals.css         design tokens (@theme) and base rules for Arabic type
components/ui           Button, Field, Input, Select, Tag, Badge, Skeleton, EmptyState, CoachMark, Surface
components/brand        DoctorCard (the one card), WaterHero, SiteNav
config/business.ts      every business number (fees, holds, SLAs, emergency numbers, weekends)
lib/format.ts           numbers, money, dates, times (Western digits forced; three-decimal currencies)
i18n/                   next-intl routing and request config; proxy.ts handles the locale redirect
messages/               ar.json, en.json, REVIEW.md
data/sample/            synthetic doctors, specialties, bookings
docs/screens/           50 screen briefs (layout call, pointers, rules, done-when)
docs/screen-rules.md    156 rules with evidence and sources; ten decisions at the top
docs/handoff/           overview, architecture (ADRs), milestones, tasks, project notes
docs/*.xlsx, *.pdf      the screen inventory and the rules PDF
eslint/logical-css.mjs  the lint rule that bans ml-/mr-/pl-/pr-/left-/right-
scripts/                i18n-check, screenshots
```

## Rules that are easy to forget

- Logical CSS only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`). Lint enforces it.
- Phone numbers, codes, NPIs and URLs never flip: wrap in `.ltr-run` or `dir="ltr"`.
- Western digits everywhere; use `lib/format.ts`, never raw `toLocaleString`.
- Every time shown to a patient names its zone; store UTC.
- Gold is for meaning only (verified, featured, ID card trim). Logo on sand or white, never on the water.
- Every page has a skeleton with real labels and an empty state with one action. No blank waits.
- Prices and fees come from `config/business.ts`, never inline.

## Database (lane L1, tasks 1.4 and 1.5)

Supabase runs locally through the CLI (Docker needed). Ports are the CLI defaults plus 1000, so it sits beside another
local Supabase project: API `http://127.0.0.1:55321`, Postgres `127.0.0.1:55322`.

| Command | What it does |
|---|---|
| `npm run db:start` | Starts the local stack; `npx supabase status -o env` prints the URL and keys for `.env` |
| `npm run db:reset` | Rebuilds the database: every migration in `supabase/migrations`, then `supabase/seed.sql` |
| `npm run db:types` | Regenerates `lib/db/types.ts` from the local schema (never edit it by hand) |
| `npm run test:rls` | The RLS suite in `tests/rls` against the running stack: every cross-tenant read and write refused |

- Schema: one migration per table group, `supabase/migrations/<timestamp>_<lane>_<what>.sql`. RLS is on every table and
  every privilege starts revoked; policy helpers live in the unexposed `private` schema. Admin access needs the admin
  role and a TOTP session (aal2). `audit_log` is insert-only for every role.
- L1's ten migrations (`20261020000100` to `20261020001000`) create 27 tables. Among them `introduction_requests`
  (screen 32's unpaid requests and the intake chat transcript) and `professional_private` (video link, licence number,
  Stripe account: owner and admin only). `rpc('professional_busy_times')` returns a verified professional's busy
  intervals (live holds and bookings) for slot pickers. Records files are read through 10-minute signed URLs that server
  code mints after checking the share.
- Server code reaches the database only through `lib/db/client.ts` (`createUserClient`, `createServiceClient`).
- `supabase/seed.sql` is generated from `data/sample/*.json` by `python scripts/build_dev_seed.py`; it is synthetic, so
  dev data equals prototype data. Seeded accounts have no password: sign in by email code (Mailpit on port 55324).
- Registry import (task 1.5, once, idempotent; `DATABASE_URL` from `.env.example`), in this order:
  `scripts/seed_specialties.py` (the 104 groups, named with the content document's card titles),
  `scripts/map_taxonomy.py --shortlist ...` (NPPES codes to groups;
  unmapped codes to `output/taxonomy_exceptions.csv`), `scripts/seed_professionals.py --shortlist ... --registry-as-of ...`
  (unclaimed listings, idempotent on NPI: the three doctor sheets, 28,584 doctors (3 denturists there are not doctors); "Other Professions" and "Low (review)"
  are refused, so students and other professions get no listing), `scripts/enrich_cms.py --dac ... --as-of ...` (report in
  `output/cms_join_report.md`). The shortlist and the CMS files are not in the repo. Python 3.10+,
  `pip install -r scripts/requirements-seed.txt`.

## Stripe webhook (lane L2, task 1.8)

`POST /api/stripe/webhook` is the only place money state is written (ADR-6). It verifies the `Stripe-Signature` header
against the raw body with `STRIPE_WEBHOOK_SECRET` (400 on failure), inserts the event into `stripe_events` before any
handler runs (a known, handled `event_id` answers 200 and stops), then calls the handler for the event's type from
`lib/stripe/handlers.ts`. A handler error is recorded on the row and answered 500, so Stripe retries; the retry takes the
failed row back and runs the handler again. An attempt that died without recording anything (process killed, database
gone) is taken back by the first delivery five minutes after it started (`STALE_ATTEMPT_MS`); a delivery inside those five
minutes answers 409, so Stripe tries again later. Types with no handler are stored and acknowledged. The payload is never
logged.

- `stripe_events` (`supabase/migrations/20261021000100_l2_stripe_events.sql`) is service role only: every privilege revoked
  from anon and authenticated, RLS on, and a restrictive deny policy; `tests/rls/stripe-events.rls.ts` proves it.
- `lib/stripe/client.ts` holds the one Stripe client: API version `2026-09-30.endive` pinned in code, 20 s timeout.
- M3 adds a handler by adding one entry to `stripeHandlers`; the route does not change. Handlers must be idempotent.

| Command | What it does |
|---|---|
| `npx vitest run --config tests/unit/stripe/vitest.config.ts` | Unit tests, database mocked (signature, duplicate, handler error, retry, an attempt still running or dead) |
| `node scripts/stripe-webhook-replay.mjs` | Against a running local server: one signed event posted twice (one row), a bad signature (400), a retry after a failure, a delivery while an attempt runs (409), one after an attempt died. Needs `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BASE_URL` in the shell |
| `bash scripts/stripe-trigger-twice.sh` | The same with the Stripe CLI and test keys: `stripe trigger payment_intent.succeeded` twice and a second delivery; one row per event id. Setup steps in the script header |
## AI client and the extraction spike (lane L3, task 1.9)

- `lib/ai` is the only way to a model: `extractPage(page, locale, { jobId })` and `summarise(items, locale, { jobId })`,
  both `{ ok, data } | { ok, error }`. Vendor and model come from `AI_VENDOR` and `AI_MODEL` (`.env.example`); the
  Anthropic and Bedrock SDKs are each imported in one adapter under `lib/ai/vendors/`. No tools, no Batch or Files API, no
  prompt caching (ADR-3, ADR-4). Output is validated with zod (`lib/ai/schemas.ts`); invalid output is retried once, then
  the call fails.
- Every call writes one `ai_calls` row (service role only; the trigger adds its tokens and cost to the job's `ai_jobs`
  totals). The per-job token cap is `aiLimits.jobTokenCap`; timeouts, the retry, the circuit and effort are `aiClient`,
  and per-model prices `aiPricing`, all in `config/business.ts`.
- Fixtures: synthetic documents in `fixtures/` (`node fixtures/generate.mjs` rebuilds them), hand-written expected items
  in `fixtures/expected/`. Spike: `node --env-file=.env scripts/spike_extraction.ts` writes `output/spike_report.md`;
  `node scripts/spike_extraction.ts --check` checks everything short of calling the model.
- Unit tests: `npx vitest run --config tests/unit/ai/vitest.config.ts` (no key, no database). `tests/rls/ai-calls.rls.ts`
  runs with `npm run test:rls`.

## Known notes

- `npm audit` reports dev-only findings inside `eslint-config-next`'s tooling (braces/micromatch). They do not ship to the browser; revisit when `eslint-config-next` publishes a fix.
- Readex Pro is self-hosted under `public/fonts/` (SIL OFL).
- Next.js 16 uses `proxy.ts` where older docs say `middleware.ts`.

## Transactional email (lane L4, task 2.9)

- Eight templates in `lib/email-templates/` (one layout, copy under `email.*`); flows send with
  `sendEmail(template, locale, to, data, { idempotencyKey })` from `lib/email-templates/send.ts`, never from a page.
- Preview: `/ar/emails/<template>` and `/en/emails/<template>` (`?view=text`, `?variant=`), only in builds with
  `NEXT_PUBLIC_DEV_ROLE_SWITCH=1`; other builds answer 404.
- Tests: `npx vitest run --config tests/unit/emails/vitest.config.ts`.
- Test send (needs `RESEND_API_KEY`): `npx --yes tsx@4.23.15 scripts/email-test-send.ts you@example.com`; `--dry-run` renders
  all sixteen without a key.
- The wordmark and links in an email come from `NEXT_PUBLIC_SITE_URL`: for a test send set it to a host Gmail and Outlook can
  reach (not localhost); the script warns otherwise.

ProgrammX · programmx.com · hello@programmx.com · Confidential
