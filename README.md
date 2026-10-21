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

ProgrammX · programmx.com · hello@programmx.com · Confidential
