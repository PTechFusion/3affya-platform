# Screen playbook: the brief every build agent receives

One agent, one screen, one branch. You start fresh: this file, `CLAUDE.md` and the screen brief are your whole context.
Screen 1 (home) was built exactly this way; read `app/[locale]/page.tsx` as the worked example.

## 1. Read, in this order

1. `CLAUDE.md` (project rules; the ADR constraints are not negotiable).
2. Your brief: `docs/screens/NN-slug.md`. Layout call, pointers, states, "Done when".
3. The rules your brief cites, in `docs/screen-rules.md`.
4. `components/ui/index.tsx` and `components/brand/*` (what already exists; use it, do not fork it).
5. `lib/sample.ts`, `lib/format.ts`, `lib/viewer.ts`, `config/business.ts`, `data/sample/*.json`.
6. `messages/en.json` and `messages/ar.json`: the `common`, `nav`, `card`, `portal` namespaces.
7. `app/[locale]/page.tsx` (home) and, for portal screens, `app/[locale]/patient/layout.tsx` + `components/brand/PortalShell.tsx`.

## 2. Route map

Routes are fixed here so screens agree with each other. Do not invent paths.

| # | Screen | Route(s) | Shell |
|---|---|---|---|
| 1 | Home | `/` | public |
| 2 | Why US training | `/why-us-training` | public |
| 3 | How it works | `/how-it-works` | public |
| 4 | Specialty directory | `/specialties` | public |
| 5 | Search results | `/search?specialty=&q=&language=&visit=&age=&gender=&sort=` | public |
| 6, 7 | Doctor profile (unclaimed, verified) | `/doctors/[id]` (sample ids `doc_001`..`doc_020`; state from data) | public |
| 8 | Intake chat | `/intake` and `/?chat=1` (static sheet exists: `IntakeChatSheet`) | public |
| 9 | Claim invite landing | `/claim/[token]` | public |
| 10 | This is me / remove me | `/doctors/[id]/this-is-me` | public |
| 11 | AI tools | `/ai-tools` | public |
| 12 | For professionals | `/for-professionals` | public |
| 13 | FAQ | `/faq` | public |
| 14 | About | `/about` | public |
| 15 | Contact | `/contact` | public |
| 16 | Legal (4) | `/privacy`, `/terms`, `/fees`, `/refunds` | public |
| 17 | 404 / 410 | `not-found.tsx` (done); 410 = `MissingPage variant="removed"` from `/doctors/[id]` | public |
| 18 | Sign up and login | `/sign-in` (patient), `?step=code` | public |
| 19 | Slot picker | `/book/[doctorId]` | public |
| 20 | Checkout | `/book/[doctorId]/pay` | public |
| 21 | Booking confirmation | `/patient/bookings/[id]` (`?state=confirmed`) | patient |
| 22 | Bookings list | `/patient/bookings` | patient |
| 23 | Receipts | `/patient/receipts`, `/patient/receipts/[id]` | patient |
| 24 | Records upload | `/patient/records` | patient |
| 25 | Records processing | `/patient/records/[id]` | patient |
| 26 | Summary and timeline | `/patient/records/[id]/summary` | patient |
| 27 | Sharing and consent | `/patient/sharing` | patient |
| 28 | Settings | `/patient/settings` | patient |
| 29 | Profile builder | `/professional/builder` | professional |
| 30 | Availability editor | `/professional/availability` | professional |
| 31 | Practice ID card | `/professional/card` | professional |
| 32 | Introduction inbox | `/professional/inbox` | professional |
| 33 | Membership and billing | `/professional/membership` | professional |
| 35 | Payouts setup | `/professional/payouts` | professional |
| 36 | Shared summaries | `/professional/shared` | professional |
| 37 | Admin login (TOTP) | `/admin/login` (no shell) | none |
| 38 | Credential review queue | `/admin/review`, `/admin/review/[id]` | admin |
| 39 | Listings | `/admin/listings` | admin |
| 40 | Specialty list | `/admin/specialties` | admin |
| 41 | Removal requests | `/admin/removals` | admin |
| 42 | Members and subscriptions | `/admin/members` | admin |
| 43 | Payments, refunds, payouts | `/admin/payments` | admin |
| 45 | AI jobs and costs | `/admin/ai-jobs` | admin |
| 46 | Outreach and invites | `/admin/outreach` | admin |
| 47 | Audit log | `/admin/audit` | admin |
| 48 | Brand page | `/brand` (done) | public |
| 34, 44, 49 | Featured banner, Banners, Emails | not in this build | |

Portal section slugs live in `lib/portal-nav.ts`; the shells (`app/[locale]/{patient,professional,admin}/layout.tsx`) already
render navigation, so a portal screen is just its `page.tsx` (+ `loading.tsx`) under the section folder.

## 3. The loop

```bash
git checkout dev && git pull && git checkout -b screen/NN-slug
npm ci                                          # in a fresh worktree; a symlinked node_modules breaks Turbopack
# build the route(s) ...
npm run check                                   # lint (logical CSS), types, i18n parity
npm run build && PORT=31NN npm run start &      # NN = your screen number, so parallel agents do not collide
BASE_URL=http://localhost:31NN ROUTES='/faq,/faq?state=empty' npm run screens
```

`npm run screens` writes `scripts/screenshots/<route>-<locale>-<width>.png` and **fails on any page error or horizontal
overflow**. Open every PNG (Read tool) and compare with the layout call. Two or three passes is normal. Stop the server by
port when done: `kill $(ss -ltnp | grep ':31NN ' | grep -oP 'pid=\K[0-9]+')`. Never `pkill -f` with a pattern that could
match your own shell.

Commit as `M<milestone>.<task> <screen name>` (one task id, from the brief header), push the branch. Do not merge.

## 4. Rules of the road

- **Shared components only.** Build from `components/ui` and `components/brand`. Need a new primitive? Add it to
  `components/ui/index.tsx` at the end, generic (no page-specific copy or data), and name it in your report with one line of
  why. Never restyle a primitive inside a page; never add a colour, radius or font size that is not a token.
- **Sample clocks.** Dates and slots go through `sampleInstant` (whole-day shift, keeps clock times). Hour-level spans (SLA
  timers, durations) go through `sampleInstantExact(iso, authoredNowIso)` so a request authored 40 h ago always reads 40 h old.
- **Cross-page `_parts` imports are not a pattern.** Anything two routes need lives in `lib/` (e.g. `lib/credentials.ts`,
  `lib/refunds.ts`, `lib/membership.ts`).
- **One `DoctorCard`.** Never fork it. `toDoctorCardData` in `lib/card-data.ts` (re-exported from `lib/sample.ts`; no JSON
  imports, so client components may use it) is the only mapping.
- **Links vs buttons.** Navigation is `<Link>` or `LinkButton`; actions are `<Button>`. Never nest interactive elements
  (`<a>` in `<a>`, `<button>` in `<button>`, `<Button>` inside `<Link>`): it is invalid HTML, React fails hydration and the
  page renders twice.
- **Logical CSS only.** `ms- me- ps- pe- start- end- text-start text-end`. Lint fails the build otherwise. Directional icons
  use `ChevronNext` (mirrors in RTL); checkmarks, search, clocks and photos never mirror.
- **Numbers, money, dates, times** only through `lib/format.ts` (Western digits in both locales, zone named; `formatPercent`
  for percentages, `formatTimeRangeInZone` for hours). Never inline a price, fee or period: `config/business.ts`
  (`supportEmail`, `fullRefundCutoffHours`, membership prices, support hours all live there). The three fee lines come from
  `lib/fees.ts feeLines()` and render with `components/brand/FeeBreakdown`. Rule C5: any "from" or card price is the all-in
  `totalCents`, never the doctor fee alone.
- **Shared rules:** `lib/email.ts checkEmail` is the one email check (map its codes to your copy). `lib/sample.ts sampleInstant`
  shifts authored sample times so the first slot is always tomorrow; use it for any sample instant, never `new Date(iso)`.
  `components/ui Breadcrumbs` is the S15 trail; `SlotLink` the open-time link; `RadioCard` the card-style radio.
- **Reuse before you build:** `Disclosure` (accordion row), `CtaBand` (closing band), `SearchIcon`, `Textarea`, `Chip`,
  `SectionHeading`, `LinkButton` in `components/ui`; `TrustStrip` (`layout="stack"` for sidebars), `SearchBox` (`labels`,
  `action`, `initialOpen`), `LegalPage`, `FeeBreakdown`, `MissingPage`, `PortalShell` in `components/brand`.
- **Viewer context** (country for the emergency number, time zone) comes from `lib/viewer.ts` (`?country=`, `?tz=`).
- **Data** only from `lib/sample.ts`. If your screen needs sample rows that do not exist (bookings, receipts, invites, audit
  rows), add a small synthetic JSON under `data/sample/` plus a typed accessor in `lib/sample.ts`. Synthetic only; never a
  real record.
- **Server first.** Pages are server components; a client component only where there is interaction (search box, flip,
  form). Server actions return `{ ok, error }`; the prototype may stub them.
- **Every page ships `loading.tsx`** next to its `page.tsx`: the real frame plus content-shaped skeletons with real labels
  (`DoctorCardSkeleton`, `Skeleton`). Every list has an empty state with exactly one action (`EmptyState`).
- **Arabic default, RTL first.** Look at the `ar` PNGs first. No letter-spacing, no italics, no justified text. Specialty names
  Arabic first. Neutral respectful register.

## 5. States

Every state in the brief must be reachable without code changes, by sample data or by query param:

- `?state=loading` renders the skeleton; `?state=empty` the empty state; `?state=error` the error state where the brief has one.
- Flow steps use `?step=`; data-driven variants use the sample ids (`doc_001` verified, `doc_009` pending, `doc_013` unclaimed).
- List states in your report with the exact URL for each, so the reviewer can open them.

## 6. Copy

- Keys under **your own namespace** (`faq.*`, `checkout.*`, `adminReview.*`), dot.separated, same keys in both files.
  Reuse `common.*` and `card.*` where they fit. Never edit another namespace.
- English is the source; Arabic is your best draft and stays `needs_review` (do not touch `ar.reviewed.json`).
- Metadata: export `generateMetadata` with `metaTitle` and `metaDescription` from your namespace.

## 7. Your report (the only thing the orchestrator reads)

```
Screen NN <name>  branch screen/NN-slug  commit <sha>
Routes: ...
States: <state> -> <url>   (one per line)
PNGs: scripts/screenshots/<...>  (list)
Done-when: [x]/[ ] per line of the brief, with a word on any [ ]
Deviations from the layout call: numbered, with the reason (goes to column N of the inventory)
New shared components or primitives: name, one-line why (or "none")
New sample data: file, rows (or "none")
Open questions for Dr Ayman / counsel: (or "none")
```

## 8. Wave review (one Fable session per wave, all screens together)

The reviewer gets every report in the wave, the diff of each branch against `dev`, and the PNGs. It checks, per screen:

1. "Done when" lines, each against the PNGs, not the report.
2. Layout call vs. the `ar-390` PNG first, then `en-390`, then both 1280s: order of blocks, above-the-fold content, the hook.
3. The cited rules (by ID) actually applied.
4. Both locales at both widths: no clipped, mixed-direction or overflowing text; numbers Western; dates with zone.
5. Every listed state opens and looks like the brief says.
6. `components/ui` and `components/brand` diffs: additions justified, nothing page-specific, nothing forked.
7. `messages/*` diffs: own namespace only, parity, Arabic register.
8. Hydration and HTML validity (`npm run screens` output has no PAGE ERRORS).

And across the wave: shared primitives added twice under different names, divergent patterns for the same thing (filters,
tables, forms), and copy that contradicts another screen. Verdict per screen: **merge**, or **return** with a numbered fix
list. Returned screens get one more build pass, then come back to the reviewer with the next wave.

## 9. Consolidation backlog (do when touching these pages; new screens must not add to it)

- Home, 03, 12, 13, 16 hand-roll `<details>` accordions: move to `Disclosure` (home done).
- 02, 03, 12 hand-roll the closing CTA band: move to `CtaBand` (home done).
- Last-reviewed date is implemented four ways (02, 13, 14 constants; 16 `lib/legal.ts`): one `lib/reviewed.ts` map and a
  `ReviewedOn` line.
- Verifier URLs (ABMS Certification Matters, FSMB DocInfo) duplicated in 02 and 14: `config/verifiers.ts`.
- 03 renders its three fee lines in its own `<dl>`: switch to `FeeBreakdown`.
- 12 renders its own plan table: switch to `components/brand/PlanTable` (add `recommended` and per-plan `action` props). Before
  1.11 if time allows, otherwise when 12 is next touched.
- `DoctorCard` hides the visit-types row when none are set; rule C1 wants "not stated" (`card.notStated`) instead.
- Zone labels are rendered three ways (`ltr-run`, `ltr-run` + `dir`, `<bdi dir="ltr">`): settle on `ltr-run`. 33 and 36 each
  define `DAY_MS`: move to `lib/format.ts` when a third user appears.
- 30: US city names appear in Latin inside Arabic copy ("Chicago"); add a `zones.*` map for the doctor time zones.

- `Notice` primitive: seven hand-rolled notice boxes (19 Note, 20 Notice, 22 justCancelled, 24 handed-off box, 25 unreadable
  line, 28 deletion banner, 33 past-due banner). Add `Notice` {tone: info|success|warning|danger, title, body, action} to
  `components/ui`; migrate each page when next touched. New screens must use it.
- `Sheet` (27, native `<dialog>`) is the one sheet/dialog primitive. Migrate in this order when touched: 22 CancelBooking
  dialog, 29 builder card dialog, search filter sheet. 26's source sheet stays server-rendered and URL-driven.
- Not-found inside a portal: an in-shell `EmptyState` with one action (200), as 21, 23 and the inbox detail do. 24/25 and 26
  answer a layout 404 today; move them when next touched. "Not mine" and "unknown" must look the same (leaks nothing).
- Gulf phone rules live twice (20 `details.ts`, 28 `validation.ts`) and country names in four namespaces: one `lib/phone.ts`
  and a `common.countries` map before task 3.6.
- `business.weekend` has no GB (or other non-Gulf) rows, so a London viewer gets no weekend shading on 19.
- 29's local FilePick → the `FilePick` primitive (24/25). 22 rows show Join on every upcoming visit; reuse 21's `daysUntil`
  (move to lib/format) so rows show View until the day.
- 26: gate the summary with `recordSetFor(id)` and add a second Noura set with a conflict flag and a reviewed state so both
  states stay demoable; add `print:hidden` to PortalShell for the summary print.
- Receipts (23) must also list records payments (24/25) once records.json carries a payment row.

Professional portal facts (wave 3): the signed-in doctor is `sampleProfessional` (doc_002, Chicago) on every portal page and
dates about the doctor's own work show in that zone unless `?tz=` is set. The builder (29) deliberately opens on doc_013, the
registry pre-fill that `/claim/[token]` hands over; `?doctor=doc_002` is the editing state. Card previews stay in the patient's
zone. Do not "fix" either.

- `StatTile` {label, value, note?, href?, current?, size "md"|"lg"} on a Surface with a tabular value: 45's spend tiles and 46's
  funnel tiles are the two page-local copies. `StepMarker` {state}: extract from patient/records/_parts/StepList.tsx and
  delete 45's JobDetail copy. One commit, after wave 5.
- `formatZone` should render the city from a `zones.*` map in both locales (every admin screen shows "Riyadh (GMT+3)" in Latin
  inside Arabic); 28's `settings.timeZone.places` is the seed.
- Badge and Notice share the hex tints #E4F4EC / #FBE9E7: add `--color-success-100` / `--color-danger-100` tokens and use them in both.
- 33 computes grace inline; switch to `lib/membership.ts` (42) when touched. 45 switches its job instants to `sampleInstantExact`
  when touched (its "today" tile is empty before ~03:40 Riyadh). Screen 49 (email templates) must import 46's
  `_parts/email-copy.ts` (move it to `lib/email-templates` then), not write a second claim-invite email.
- `lib/audit.ts` vocabulary gaps for the real actions (task 2.8/3.11): listing.suspended/unsuspended, specialty.*,
  removal.infoRequested, membership.*, refund.requested, aiJob.retried/stopped, invite.sent/revoked, account.deleted,
  data.exported, share.revoked, admin.signedOut (each with adminAudit.actions.* in both languages).

Patient portal facts (wave 4): the signed-in patient is `samplePatient` (Noura, Riyadh, noura@example.com) on every patient
page; every row in `data/sample/bookings.json` is hers. Patient pages render in `?tz=` else `samplePatient.timeZone`; the zone
stored on a booking row is the snapshot the doctor's inbox shows. Refund wording and arithmetic come from `lib/refunds.ts`
(`fullRefundDeadline`, `refundsInFull`, `refundFor`). One cancel flow: `patient/bookings/_parts/CancelBooking` + its action.
19/20's demo success lands on `bk_004` (Noura with Dr Omar Khalil).

## 10. Waves

| Wave | Screens | Needs |
|---|---|---|
| 0 | playbook, shells, 404, script (done) | |
| 1 | 02, 03, 11, 12, 13, 14, 15, 16 | nothing |
| 2 | 04, 05, 06+07, 09, 10 (+17 410 variant with 06) | `lib/sample.ts`, `DoctorCard` |
| 3 | 29, 30, 31, 32, 33, 35, 36 | professional shell |
| 4 | 18, 19+20, 21, 22, 23, 24+25, 26, 27, 28 | patient shell, `bookings.json` |
| 5 | 37, 38, 39, 40, 41, 42, 43, 45, 46, 47 | admin shell |

Waves 0 to 3 are the 23 Oct prototype (tasks 1.6, 1.7, then 1.11 deploy).

Admin portal facts (wave 5): the signed-in admin is `sampleAdmin` (Sara Al-Rashid, Riyadh) on every admin page; dates show in
`?tz=` else `sampleAdmin.timeZone`. A removal confirmed on 41 (`removedDoctorIds()`) makes the profile answer 410, hides the
doctor from `publicDoctors()`, lists them as Removed on 39 and blocks invites on 46; a suspended doctor (`state: "suspended"`)
answers 404 and is hidden the same way (reversible, so it must look unknown). `builder.json` owns claim submission and decision
dates; a claim is rejected only while the decision is newer than the submission. Admin-side numbers are named config exports next
to `business` (adminSignIn, credentialReview, listingRules, removalRules, membershipAdmin, adminMoney, aiLimits, outreach).
