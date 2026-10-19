# 3affya platform

US-trained, Arabic-speaking doctors for patients in the Gulf. Launch build by ProgrammX for Dr Ayman: USD 10k, 19 Oct to 4 Dec 2026. Arabic is the default locale; the product is bilingual and right-to-left first.

## Where things are
- `docs/handoff/` the four handoff files (overview, architecture with ADRs 1 to 11, milestones, tasks) and the project notes. The tasks file is the work plan; one task per session.
- `docs/screens/` one brief per screen (50). Read the brief before building a screen. `docs/screens/README.md` is the index.
- `docs/screen-rules.md` 156 evidence-backed rules by area (IDs like S5, R6, Q1). Briefs cite them; look them up here.
- `app/globals.css` the design tokens (Tailwind 4 `@theme`). `app/[locale]/brand` renders every token and component. Build screens from `components/ui` and `components/brand`; do not restyle per page.
- `config/business.ts` every business number. `lib/format.ts` every number, money, date and time formatter (forces Western digits).
- `messages/ar.json`, `messages/en.json` all copy. Arabic strings are AI-drafted and `needs_review` until Dr Ayman approves them in preview (`messages/REVIEW.md`).
- `data/sample/` synthetic doctors, specialties, bookings for the prototype.

## How to build a screen (the loop)
1. Open the brief in `docs/screens/`. Read the layout call, the pointers and the states.
2. Build the route under `app/[locale]/...` using only shared components and tokens. Every state reachable via sample data or a query param. Loading state is a content-shaped skeleton; empty state has one action.
3. Run `npm run check` (lint, types, i18n). Then `npm run build && PORT=3100 npm run start` and `BASE_URL=http://localhost:3100 ROUTES=/your-route npm run screens`; look at the four PNGs in `scripts/screenshots/`.
4. Compare with the layout call. Fix. Two or three passes is normal.
5. Commit as `M1.6 home page` (one task id per commit). Note any deliberate deviation from the layout call in column N of `docs/programmx_aafia-screen-inventory_2026-10.xlsx`.

## Status (19 Oct 2026)
Tasks 1.1 and 1.2 are done in this repo: scaffold, i18n and RTL, lint rule for logical CSS, tokens, DoctorCard, /brand. Next: 1.6 public site prototype pages, then 1.7 portal shells and builder prototype, then 1.11 deploy for Dr Ayman's approval on Fri 23 Oct. Tasks 1.3, 1.4, 1.5 (Supabase, schema, seed) run in parallel on the backend lane.

Ten decisions from the 19 Oct research are listed at the top of `docs/screen-rules.md`. Four of them wait on Dr Ayman or his lawyer (Saudi cross-border rules, UAE data residency); none blocks the prototype.

# 3affya project constraints. From the handoff ADRs. Do not relitigate.

## Stack (locked)
- Next.js (App Router), TypeScript strict, Tailwind. Pin versions in package.json; do not upgrade majors during the launch build.
- next-intl with /ar (default) and /en route segments. dir attribute set on <html> per locale.
- Supabase self-hosted (Docker Compose) for Postgres, Auth, Storage. Supabase JS client with generated types.
- Inngest for every job that is slow, scheduled, or retried. Nothing long-running inside a request or server action.
- Stripe Connect Express + destination charges + Stripe Billing. Money state is written ONLY from webhook handlers.
- Claude via lib/ai only. Vendor (anthropic | bedrock) and model id come from env. Never call a model SDK outside lib/ai.
- Resend for email. Sentry for errors. Python only for one-off seed and mapping scripts under /scripts.

## Rules
- RLS default-deny on every table. Every new table ships with policies AND a cross-tenant test in tests/rls.
- Authorisation is decided in RLS and server code. UI never decides access.
- Logical CSS only: ms-, me-, ps-, pe-, start-, end-, text-start, text-end. ESLint fails the build on ml-, mr-, pl-, pr-, left-, right-, text-left, text-right.
- All instants stored as timestamptz in UTC. Convert for display with the viewer's IANA timezone. Never store local times.
- Every outbound network call has an explicit timeout. Every retried operation is idempotent on a key stored in the database.
- Stripe webhook: insert into stripe_events (event_id PK) BEFORE handling; on conflict return 200 and stop.
- Records pipeline is a fixed workflow (validate, quote, pay, extract per page, dedupe, summarise, flag, store, notify). Do NOT build an agent loop. Do NOT give the model tools during extraction.
- Model output is validated against the zod schema in lib/ai/schemas before anything downstream reads it. Invalid output is a retry, then a failure, never a partial write.
- Items the documents do not support are omitted or flagged, never invented. Unreadable pages are flagged "unreadable" with the page reference.
- Medical values use Western digits in both locales.
- No real patient document is ever placed on a developer machine, the VPS, or any non-production environment. Use fixtures in /fixtures (synthetic).
- Secrets only in env. Never in the repo, never in client bundles, never in logs. PII scrubbed from Sentry.
- Business numbers (fees, prices, grace periods, hold minutes, retention) live in config/business.ts. Never inline a price.
- Every page has a loading state that shows something useful (skeleton with real labels, cached content, or a next action). No blank spinners.
- Brand tokens in app/brand and tailwind.config. Do not add ad hoc colours or font sizes. The ikioo screens are a flow reference only; never copy their colours or fonts.
- One DoctorCard component renders the builder preview, search results, profile header and the ID card image. Do not fork it.

## Out of scope for this build (do not start)
- Mobile apps. Hosted video. Fax or bulk email sending. Custom Stripe onboarding, payout, invoice or card UI (Stripe hosts these). AI agents other than records summary (1), missing-record checker (6), duplicate organiser (7) and the light intake chat (launch version of 12); the full website chatbot is a later batch. Medication substitution advice. Anything after the first visit. Booking reminders and the home banner carousel (January). From ikioo: peer-invite publishing gate, coins, paid ask-a-question, NFT minting, facial recognition, media on expertise tags.

## Conventions
- Tests: vitest for unit, Playwright for the QA script, a tests/rls suite that runs against the dev stack.
- Errors: server actions return { ok, error } discriminated unions; never throw across the client boundary.
- Naming: tables snake_case, TS camelCase, i18n keys dot.separated by page.
- Commits: one task id per commit message, e.g. "M2.4 profile builder".
