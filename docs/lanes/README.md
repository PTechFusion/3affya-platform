# Lanes: the brief every backend and integration agent receives

The screens are done (`docs/screens/PLAYBOOK.md`). What is left is everything behind them. That work is cut into lanes
that do not touch each other's files, so several agents can run at once, the way the screen waves did. One agent, one lane,
one branch. You start fresh: this file, `CLAUDE.md`, your lane brief and the handoff task text are your whole context.

## 1. The lanes

| Lane | Brief | Handoff tasks | Can start | Owns (nobody else writes here) |
|---|---|---|---|---|
| L0 | [Human lane](L0-human.md) | 1.3, 1.10, Dr Ayman reviews | now | VPS, DNS, vendor accounts, `messages/REVIEW.md` answers |
| L1 | [Schema, RLS, seed](L1-schema-rls-seed.md) | 1.4, 1.5 | now (local Supabase) | `supabase/`, `tests/rls/`, `lib/db/`, `scripts/*.py`, `output/` |
| L2 | [Stripe webhook](L2-stripe-webhook.md) | 1.8 | now | `app/api/stripe/`, `lib/stripe/`, `tests/unit/stripe/`, migration `stripe_events` |
| L3 | [AI client and extraction spike](L3-ai-client.md) | 1.9 | now | `lib/ai/`, `fixtures/`, `scripts/spike_extraction.ts`, `tests/unit/ai/`, migration `ai_calls` |
| L4 | [Email templates](L4-email-templates.md) | 2.9, screen 49 | now | `emails/`, `lib/email-templates/`, `app/[locale]/emails/`, `tests/unit/emails/` |
| L5 | [Quality and CI](L5-quality-ci.md) | 4.3 (early) | now | `tests/unit/lib/`, `tests/e2e/`, `.github/`, `ops/`, `vitest.config.ts`, `playwright.config.ts` |
| L6 | [Data wiring](L6-data-wiring.md) | 2.1 to 2.8, 3.6, 3.10, 3.11 (data half) | after L1 merges | `lib/data/`, the `page.tsx` files it migrates |
| L7 | [Auth and gating](L7-auth.md) | ADR-8, 2.3, 1.7 last item | after L1 merges | `lib/auth/`, `app/[locale]/sign-in`, `app/[locale]/admin/login`, `middleware.ts`, portal layouts |

Shared files every lane may append to, never rewrite: `.env.example`, `package.json` (pinned versions only), `config/business.ts`
(append a block under your lane's comment), `README.md`. Resolve a conflict in these by keeping both sides.

Table ownership for migrations (so two lanes never create the same table): L1 creates every table in the architecture Data
section except `stripe_events` (L2) and `ai_calls` (L3): 27 tables, `introduction_requests` and `professional_private`
among them (delivered in PR #4, 20 Oct 2026). Each of those two lanes ships its own migration file. Migration file names are
`supabase/migrations/<YYYYMMDDHHMMSS>_<lane>_<what>.sql` so they sort and never collide. L1's run from `20261020000100` to
`20261020001000`; every other lane uses a later timestamp (a migration that references an L1 table must sort after it).
A lane that ships a table also adds `tests/rls/<table>.rls.ts` (a new file in L1's folder; no L1 file changes), as CLAUDE.md
requires.

Review results: `BACKLOG.md` in this folder lists what the wave reviews found and left for later, by lane; the questions for
Yasir, Dr Ayman and counsel are in `docs/open-questions/`.

## 2. Read, in this order

1. `CLAUDE.md` (project rules; the ADR constraints are not negotiable).
2. Your lane brief in this folder. Deliverables, "Done when", what is not yours.
3. The task text in `docs/handoff/programmx_handoff-tasks_2026-10.md` for your task ids, and the architecture sections your
   brief names in `docs/handoff/programmx_handoff-architecture_2026-10.md`.
4. `lib/sample.ts` and `data/sample/*.json`: the shapes the screens already consume. The real data must fit these shapes or
   the brief says where they may change.
5. `config/business.ts`, `lib/format.ts`, `.env.example`.

## 3. The loop

```bash
git checkout dev && git pull && git checkout -b lane/<slug>      # slug from your brief header
npm ci                                                            # fresh worktree; a symlinked node_modules breaks Turbopack
# build ...
npm run check                                                     # lint, types, i18n parity: must stay green
npm run test                                                      # vitest (L5 adds the script; until then: npx vitest run)
```

Commit as `M<milestone>.<task> <what>` (one task id per commit, from the brief header). Push the branch, open a PR into `dev`
(never into `main`). Do not merge. The orchestrator reviews a batch of lanes together, like a screen wave.

## 4. Rules of the road

- **Secrets only in env.** `.env` is gitignored. Add every new variable to `.env.example` with a one-line comment and a
  `# lane L<n>` tag. `grep -rnE '\bsk_|service_role|\bre_[A-Za-z0-9]' --include=*.ts . | grep -v node_modules` must print
  nothing (word boundaries since 20 Oct 2026: the old form matched column names such as `failure_reason` in the generated
  `lib/db/types.ts`).
- **Synthetic only.** No real patient document, no real patient name, nowhere. Fixtures under `fixtures/` are generated or
  Yasir's own. The NPPES shortlist is public registry data and is fine.
- **Timeouts and idempotency.** Every outbound call has an explicit timeout (Stripe 20 s, AI 120 s per page, Resend 10 s).
  Every retried operation is idempotent on a key stored in the database.
- **`{ ok, error }`** from every server action; never throw across the client boundary. Route handlers return proper status
  codes and never leak stack traces.
- **Types from the database.** `lib/db/types.ts` is generated (`supabase gen types`); nobody edits it by hand. Until L1
  merges, other lanes declare the one or two row types they need in their own folder and switch to the generated file after.
- **No new majors.** Pin exact versions. Allowed additions are listed per brief; anything else goes in your report as a
  question, not in `package.json`. Already pinned by L1: `vitest@5.0.3` and `vite@8.3.4` (vite explicit so the lockfile
  keeps rolldown's native bindings), `@supabase/supabase-js@2.117.2`, `supabase@2.119.0`; keep the same versions.
- **Docker may be absent.** If `supabase start` or Docker cannot run on your machine, build everything, write the tests, mark
  the unverified done-when items `[ ] not run here: <reason>` in your report. Never fake a green result.
- **Keep the screens green.** `npm run build` must pass; the screens must still render from sample data until L6 switches
  them over, so nothing in L1 to L5 changes a page.

## 5. Your report (the only thing the orchestrator reads)

```
Lane L<n> <name>  branch lane/<slug>  PR #<n>  commit <sha>
Deliverables: path -> one line each
Done-when: [x]/[ ] per line of the brief; for each [ ] the reason (blocked on L0 item, Docker absent, ...)
Verified how: the commands you ran and their last line
New env vars: NAME (where used)
New dependencies: name@version (why)
Appended to shared files: list
Open questions for Yasir / Dr Ayman / counsel: (or "none")
```
