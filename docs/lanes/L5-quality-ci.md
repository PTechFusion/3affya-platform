# L5. Quality and CI — branch `lane/quality` — task 4.3 started early, conventions from CLAUDE.md

**Depends on:** nothing. Runs against the prototype as it is.
**Not in this lane:** fixing defects beyond what blocks a test (file them in `ops/known_defects.md`), RLS tests (L1).

## Read
CLAUDE.md conventions (vitest for unit, Playwright for the QA script). Task 4.3. `scripts/screenshots.mjs` (how the app is
started and driven today; reuse its viewport and locale handling). `docs/screens/PLAYBOOK.md` §2 route map and §5 states.
The pure modules under `lib/`: `format.ts`, `refunds.ts`, `slots.ts`, `otp.ts`, `credentials.ts`, `ics.ts`, `membership.ts`,
`fees.ts`, `card-data.ts`, `email.ts`, `records.ts`, `inbox.ts`, `audit.ts`.

## Deliverables
- `vitest.config.ts`, `npm run test` and `npm run test:unit`. `tests/unit/lib/*.test.ts`: one file per pure module above.
  Cover: Western digits in both locales, zone labels (negative offsets do not wrap), money in minor units, the full-refund
  deadline across the 1 Nov 2026 US DST change for Riyadh, Houston and London viewers, slot generation across the same
  boundary, fee lines sum to the all-in total, email check codes, ICS escaping, credentials MB rounding.
- `playwright.config.ts`, `npm run test:e2e`. `tests/e2e/`: the three journeys in both locales, phone (390) and desktop
  (1280): patient (home, search, profile, slot picker, checkout, confirmation, bookings, receipts, records upload, summary,
  sharing, settings), professional (claim landing, builder on phone width, availability, card, inbox, membership, payouts),
  admin (login, review queue and detail, listings with suspend sheet, removals, members, payments, AI jobs, outreach, audit).
  Assert the key element of each page, no console errors, no horizontal overflow, `dir` matches the locale. Build the app
  once with `NEXT_PUBLIC_DEV_ROLE_SWITCH=1` and run `next start` on a port of your own (3150), the way `npm run screens` does.
- `tests/e2e/a11y.spec.ts`: axe-core on every route in the playbook route map, both locales; serious and critical
  violations fail, moderate ones are listed in `ops/known_defects.md`.
- `.github/workflows/check.yml`: on every pull request into `dev` and every push to `dev` and `main`: `npm ci`,
  `npm run check`, `npm run test:unit`, `npm run build`, then `npm run test:e2e` with Playwright's Chromium installed by the
  action. Cache `node_modules` and the Playwright browsers. Fail the PR on any step.
- `ops/known_defects.md`: the list the e2e run produces, one line each with route, locale, width, what, and the screen number.

## Done when
- [ ] `npm run test:unit` green with the modules above covered
- [ ] `npm run test:e2e` walks all three journeys in both locales and widths with zero blocking defects
- [ ] The workflow runs green on your PR
- [ ] `ops/known_defects.md` exists (empty list is fine); `npm run check` green

## Notes
- Allowed additions: `vitest`, `@vitest/coverage-v8`, `@axe-core/playwright` (pinned). `@playwright/test` is already pinned;
  do not change its version.
- The DST test dates are fixed instants; do not use `new Date()` without injecting it.
- If an e2e journey cannot pass because a page has a defect, record it and mark that step skipped with the defect id;
  do not change the page.
