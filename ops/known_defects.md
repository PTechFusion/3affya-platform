# Known defects

What the quality lane's runs found (lane L5, task 4.3 started early, 21 Oct 2026): `npm run test:e2e` (three journeys, every
route of the route map, axe on every route; both locales; 390 and 1280) and `npm run test:unit`. One line per defect. Pages
were not changed: a journey step a defect blocks is skipped with its id, and a recorded axe finding is reported, not failed.
The suite recognises each line through `tests/e2e/support/known-defects.ts` (same ids; the e2e run refuses to start when the
two lists disagree). After each run, `test-results/e2e/a11y-summary.md` lists every axe finding with its routes; a finding
marked NEW there is not on this list.

**Fixed on 23 Oct 2026 (wave review of lanes L1 to L5), lines removed below:** the how-it-works fee labels now read the keys
the messages have, and the success, warning and danger text tokens are darker (5.2:1 or better on their tints and on white,
one change in `app/globals.css`), which cleared the five badge and tone-text contrast findings. The suite checks those pages
in full again.

**Blocking defects: none.** Every step of the patient, professional and admin journeys passes in both locales at both widths,
except the `/intake` step (KD-001), which is skipped; the intake chat itself opens from the home page (`/?chat=1`) and passes.

Severity: **major** visible to every visitor of the page; **serious** / **moderate** / **minor** are axe's impact levels
(WCAG 2.2 AA); **check** needs a person to confirm.

| ID | Severity | Screen | Route | Locale | Width | What | Found by |
|---|---|---|---|---|---|---|---|
| KD-001 | minor | 8 | /intake | ar, en | 390, 1280 | Answers 404. The route map lists `/intake` and `/?chat=1` for the intake chat; only `/?chat=1` exists. Patient journey step "intake chat at /intake" skipped. | patient journey |
| KD-007 | serious | 6 | /doctors/doc_013 | ar, en | 390, 1280 | Unclaimed profile, registry source line ("Source: CMS Doctors and Clinicians file · updated ..."): `text-ink-500` #5E6A77 on `sand-200` #E2DCCE is 4.03:1. | a11y.spec |
| KD-008 | serious | 21 to 47 (every portal page) | /patient/\*, /professional/\*, /admin/\* | en | 390, 1280 | Dev role bar ("Prototype, viewing as"): the other-portal links at `opacity-70` are #A58542 on #F8EBC4, 2.92:1. Prototype only: compiled out when `NEXT_PUBLIC_DEV_ROLE_SWITCH` is unset. | a11y.spec |
| KD-009 | serious | 48 | /brand | en | 390 | The horizontally scrolling token table (`overflow-x-auto`) cannot be reached by keyboard: the scroll box has no `tabindex="0"` and nothing focusable inside. | a11y.spec |
| KD-010 | moderate | 1, 5, 6, 7, 8, 12, 20 to 47 | /, /?chat=1, /search, /doctors/doc_002, /doctors/doc_013, /for-professionals, /book/doc_002/pay, every portal page, /admin/login | ar, en | 390, 1280 | Content outside any landmark (axe `region`): the dev role bar on portal pages, the home and for-professionals heroes above `<main>`, the unclaimed-profile registry bar, the profile's fixed phone Book bar, a bar at the top of search, checkout's hold and total bar, the admin login language switch. | a11y.spec |
| KD-011 | moderate | 8 | /?chat=1 | ar, en | 390, 1280 | The intake sheet's `<header>` is a second banner landmark beside the site header (axe `landmark-no-duplicate-banner`, `landmark-unique`). | a11y.spec |
| KD-012 | minor | 8 | /?chat=1 | ar, en | 390, 1280 | The intake sheet is `<aside role="dialog">`; `dialog` is not an allowed role on `<aside>` (axe `aria-allowed-role`). | a11y.spec |
| KD-013 | minor | 29, 38 | /professional/builder, /admin/review/[id] | ar, en | any | Credential file sizes: `toMb` at one decimal shows a file under 0.05 MB (about 52 KB) as "0 MB". Expected failure in `tests/unit/lib/credentials.test.ts`. | unit |
| KD-014 | check | 5, 7, 12, 31, 48 and the builder preview | every DoctorCard back face | ar, en | 390, 1280 | Not measurable by axe (gradient behind a 3D flip). Computed from the gradient stops: the `text-white/75` labels (12 to 13 px) are about 4.9:1 at the dark corner but about 3.9:1 at mid-card (#08708E), under 4.5:1. Check the back face by eye with a contrast picker. | a11y.spec (excluded nodes) |

## What the runs could not see

- **Arabic colour contrast.** axe 4.13 skips most Arabic text in its contrast check: its icon-ligature heuristic reads joined
  Arabic glyphs as an icon font. The colour tokens are the same in both locales, so the English scans carry the contrast
  findings above; Arabic-only colour choices would go unnoticed.
- **DoctorCard faces.** axe measures a flip card's hidden face and reads the back face's gradient as the sand page behind it
  (white on teal scores about 1.1:1). Those nodes are dropped from the scan and counted in each test's annotations (KD-014).
- **Server logs.** The e2e checks read the browser console. Server-side errors (a MISSING_MESSAGE for a key a page asks for, say) surface only
  when they change the page; `npm run test:e2e` prints the server's stderr.

## Also noted (not defects, for Yasir)

- Credential sizes use binary megabytes (`lib/credentials.ts`, 1 MB = 1,048,576 bytes) while records use SI megabytes
  (`lib/records.ts`, 1 MB = 1,000,000 bytes, "as phones show them"). The same file reads about 5% smaller on the builder than
  on a phone. One unit for both would match what doctors see on their phones.
- The portal overview pages (`/patient`, `/professional`, `/admin`, the phone bar's "More") have no `<h1>`; they are not in
  the route map, so the suite does not scan them.
