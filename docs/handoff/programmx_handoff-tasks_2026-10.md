# 3affya Launch Platform: Task Breakdown (for Claude Code execution)
`Confidential`

Each task is sized for one Claude Code session. Tasks are dependency-ordered inside each milestone. "Done when" lines are checks a machine or a two-minute manual step can verify. Defaults marked **(default until Q-n)** apply until the matching open question in the overview is answered; change them in one place (`config/business.ts`), never inline.

**Updated 17 Oct:** light intake chat added (3.12); reminders and home carousel moved to January (3.4, 3.5); onboarding, credentials, profile editor and card preview merged into the profile builder modelled on the ikioo sign-up flow (2.4, 2.5, 2.7).

**Updated 20 Oct:** Yasir's decisions after the schema lane (L1, PR #4): the directory imports doctors only, 28,584 rows, with specialty names from the content document's card titles (1.5, 4.5); introduction requests and the intake transcript stored in `introduction_requests` (1.4, 2.9, 3.3, 3.12); busy times for slot pickers (3.2); account deletion (3.6); records files only through server-minted signed URLs (3.10); production auth by email code only (4.1, 4.2).

## CLAUDE.md constraint block (paste into the project repo root)

```
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
- Records files are read only through signed URLs that server code mints after checking the share (10 minutes, storageRules.recordsSignedUrlSeconds). No client but the owning patient's reads the records bucket.
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
- Only doctors (physicians and dentists) get a listing and a card. Students and other professions are never imported; doctors practising abroad are.

## Out of scope for this build (do not start)
- Mobile apps. Hosted video. Fax or bulk email sending. Custom Stripe onboarding, payout, invoice or card UI (Stripe hosts these). AI agents other than records summary (1), missing-record checker (6), duplicate organiser (7) and the light intake chat (launch version of 12); the full website chatbot is a later batch. Medication substitution advice. Anything after the first visit. Booking reminders and the home banner carousel (January). From ikioo: peer-invite publishing gate, coins, paid ask-a-question, NFT minting, facial recognition, media on expertise tags.

## Conventions
- Tests: vitest for unit, Playwright for the QA script, a tests/rls suite that runs against the dev stack.
- Errors: server actions return { ok, error } discriminated unions; never throw across the client boundary.
- Naming: tables snake_case, TS camelCase, i18n keys dot.separated by page.
- Commits: one task id per commit message, e.g. "M2.4 profile builder".
```

## Milestone 1: Foundation, prototype and spikes

### Task 1.1: Repo, i18n and RTL scaffold
- **Depends on:** none
- **Not in this task:** Supabase, auth, any real page content
- **Done when:**
  - [ ] `npm run dev` serves `/ar` (RTL) and `/en` (LTR) with `dir` set on `<html>`
  - [ ] `npm run lint` fails on a file containing `ml-4` and passes after changing it to `ms-4`
  - [ ] `messages/ar.json` and `messages/en.json` exist with the same key set; a script `npm run i18n:check` exits non-zero on a missing key; Arabic strings are AI-drafted from the content document and marked `needs_review` until Dr Ayman corrects them in preview
  - [ ] Root layout picks the Arabic font pairing for `ar` and the Latin pairing for `en`

### Task 1.2: Brand system at /brand
- **Depends on:** 1.1; theme draft 1 on the "3affya Theme Board" canvas and Dr Ayman's reaction (overview Q18); tokens listed in the project notes (7b). The ikioo sign-up PNGs (17 Oct) inform the DoctorCard layout and coach-mark pattern only. MedBot Pro dropped 17 Oct.
- **Not in this task:** any product page
- **Done when:**
  - [ ] `tailwind.config` exposes the theme draft 1 tokens (deep sea, aqua, gold, sand, ink, sky, success, warning, danger) and Readex Pro; body text on the main background passes WCAG AA contrast
  - [ ] Gold is used only for meaning (verified badge, featured, ID card trim); expertise tags use one tinted style, not mixed colours
  - [ ] Logo in three versions under `public/brand/`: original, transparent, light-on-dark
  - [ ] `/brand` renders colours, type scale, spacing, and every component (button, input, select, card, DoctorCard in unclaimed, pending and verified states, coach mark, table, dialog, nav, empty state, skeleton) in both locales
  - [ ] Screenshot of `/ar/brand` and `/en/brand` on phone width shows no overflow

### Task 1.3: Supabase dev stack on the VPS
- **Depends on:** VPS access
- **Not in this task:** schema
- **Done when:**
  - [ ] Supabase Docker Compose runs on the VPS; Postgres is not reachable from the public internet (`nmap` from outside shows only 443 and 22)
  - [ ] Studio reachable only through an SSH tunnel
  - [ ] `.env.example` lists every variable the app needs; `.env` is gitignored

### Task 1.4: Schema v1 and RLS
- **Depends on:** 1.3
- **Not in this task:** seed data, Stripe, records pipeline logic
- **Done when:**
  - [ ] Migrations create every table listed in the architecture Data section (among them `professional_private` and `introduction_requests`, added 20 Oct; `stripe_events` and `ai_calls` are lanes L2 and L3), plus `expertise_tags` (professional_id, title max 30, nugget max 500, position, locale), with foreign keys and the indexes named in the rigor review (27 tables in L1's migrations)
  - [ ] `profiles.role` mirrors `app_metadata.role` via trigger
  - [ ] RLS enabled on every table; `tests/rls` attempts a cross-tenant read and write on each table as patient, professional and anonymous, and every attempt is refused
  - [ ] `audit_log` has insert-only grants; an update attempt fails in the test
  - [ ] `supabase gen types` output committed

### Task 1.5: Specialty taxonomy and seed import
- **Depends on:** 1.4; `output/nppes_2026-10/aafia_registry_shortlist_2026-10.xlsx`; the 104 groups from the content PDF (pages listing specialties); the CMS Doctors and Clinicians National Downloadable File
- **Not in this task:** profile pages
- **Done when:**
  - [ ] `scripts/seed_specialties.py` inserts 104 rows with Arabic and English names and slugs; the names are the content document's card titles, the 24 prototype slugs stay (20 Oct)
  - [ ] `scripts/map_taxonomy.py` maps NPPES taxonomy codes to groups; unmapped codes are written to `output/taxonomy_exceptions.csv`, never defaulted. Every large group maps to its most logical card, and on doctor rows every code that has a card is mapped; students, support roles and professions no card covers stay unmapped (20 Oct)
  - [ ] `scripts/seed_professionals.py` imports the shortlist's doctor rows (sheets "Physicians High", "Physicians Medium" and "Dentists"; students and other professions are not imported, 20 Oct) as `status = unclaimed`, `source = nppes`, idempotent on NPI; running twice changes zero rows; count equals the doctor rows (28,584: the three doctor sheets hold 28,587 rows; 3 of them are denturists, who are not doctors). Doctors practising abroad are imported, with a practice country where the registry's state or city makes it unambiguous
  - [ ] `scripts/enrich_cms.py` joins the CMS file on NPI (deduped on NPI) and fills medical school, graduation year, group practice and hospital affiliations; matched count written to `output/cms_join_report.md`
  - [ ] Each row has a stable slug `firstname-lastname-city-npiSuffix`

### Task 1.6: Public site prototype pages
- **Depends on:** 1.2, 1.5
- **Not in this task:** search logic, auth, booking
- **Done when:**
  - [ ] Routes exist and render in both locales: home, why-us-training, how-it-works, specialties, search (static results from seed), doctor profile (claimed and unclaimed variants from fixtures), ai-tools (coming soon), for-professionals, faq, about, contact, privacy, terms, fees, refunds
  - [ ] Every route has a loading state with labelled skeletons, not a bare spinner
  - [ ] Each page has one hook element (a next step, a related list, or a preview) above the fold on phone

### Task 1.7: Portal shells and builder prototype
- **Depends on:** 1.6
- **Not in this task:** auth enforcement (stubbed role switch is fine), real data
- **Done when:**
  - [ ] `/patient`, `/professional`, `/admin` layouts with navigation per the UI scope, empty states on every screen
  - [ ] `/professional/builder` clickable with fixture data: form, live DoctorCard preview, coach marks, publish checklist, phone layout with sticky mini card
  - [ ] Role switch via a dev-only query param works locally and is compiled out in production

### Task 1.8: Stripe test account and webhook stub
- **Depends on:** Stripe account created under Dr Ayman (Yasir as developer)
- **Not in this task:** charges, Connect onboarding
- **Done when:**
  - [ ] `POST /api/stripe/webhook` verifies the signature, inserts `stripe_events(event_id)`, returns 200 on duplicate
  - [ ] `stripe trigger payment_intent.succeeded` twice results in one row
  - [ ] Keys read from env only; `grep -r sk_ src` returns nothing

### Task 1.9: lib/ai client and the extraction spike
- **Depends on:** 1.4; five documents (synthetic or Yasir's own if Dr Ayman supplies none by Wednesday)
- **Not in this task:** the pipeline, quotes, payments
- **Done when:**
  - [ ] `lib/ai/index.ts` exposes `extractPage(image|pdfPage, locale)` and `summarise(items)`; vendor and model from env; every call logs model, tokens, cost, latency, pass or fail to `ai_calls`
  - [ ] `lib/ai/schemas.ts` holds zod schemas for `RecordItem` (type, label, value, unit, date, source_page_ref, confidence) and `PageExtraction`
  - [ ] `scripts/spike_extraction.ts` runs the five documents and writes `output/spike_report.md` with per-document accuracy against a hand check, cost per page, latency, and a one-paragraph verdict on whether a dedicated OCR step is needed
  - [ ] Per-job token cap enforced in the client (configurable, default in `config/business.ts`)

### Task 1.10: Email domain and Anthropic BAA request
- **Depends on:** GoDaddy access; Dr Ayman's email for the API organisation
- **Not in this task:** email templates
- **Done when:**
  - [ ] `mail.3affya.com` verified in Resend; a test email arrives in both an Arabic and an English client without encoding issues
  - [ ] Anthropic HIPAA-ready API organisation request submitted; date and reference recorded in the overview open question 10

### Task 1.11: Deploy prototype and send for approval
- **Depends on:** 1.6, 1.7
- **Not in this task:** anything new
- **Done when:**
  - [ ] Vercel preview URL with password protection shared with Dr Ayman
  - [ ] Approval request lists exactly what he is approving (including the builder flow) and the 23 Oct date

## Milestone 2: Directory, claim flow, professional portal, admin review

### Task 2.1: Directory search and filters
- **Depends on:** 1.5, 1.6
- **Not in this task:** profile editing, booking
- **Done when:**
  - [ ] `/specialties` lists 104 groups; `/search` filters by specialty, language, location, visit type, age group with URL-encoded state
  - [ ] Only `verified` rows appear; featured first; pagination 20 per page
  - [ ] A test compares the API result count to a direct SQL count for three filter combinations and they match
  - [ ] Empty state suggests nearby specialties and the invite flow

### Task 2.2: Unclaimed and claimed profile pages
- **Depends on:** 2.1
- **Not in this task:** claim flow
- **Done when:**
  - [ ] Unclaimed page shows the registry label, "invite this doctor", "this is me / remove me"; response body and public API contain no fee, availability, checkout or contact fields (asserted by test)
  - [ ] Claimed-verified page shows bio, training, languages, fees, visit types, age groups, expertise tags, availability preview, book button, verification date
  - [ ] ISR with revalidation on profile update; sitemap generated in files of at most 5,000 URLs; removed profiles return 410

### Task 2.3: Invite tokens and claim flow
- **Depends on:** 2.2, 1.4
- **Not in this task:** sending invites in bulk
- **Done when:**
  - [ ] `invites` stores a hash of the token, expiry 14 days, `used_at`
  - [ ] Valid token opens the profile builder for the doctor's own row and starts OTP sign-up; after sign-up the row is `claimed` and the token is dead
  - [ ] Expired, used and forged tokens show distinct messages and a request-new-invite action
  - [ ] Rate limit: 10 token attempts per IP per hour

### Task 2.4: Profile builder: layout, live card and credentials
- **Depends on:** 2.3, 1.2 (DoctorCard), 1.7 (builder prototype)
- **Not in this task:** availability, expertise tags, admin review UI
- **Done when:**
  - [ ] Split screen: form on the start side, live DoctorCard on the end side (flips in Arabic); on phone width the card is a sticky mini preview above the form with no sideways overflow
  - [ ] Opens pre-filled from the doctor's row (name, specialty, city and state, medical school and graduation year where present); every edit updates the card within one second without a page reload
  - [ ] Coach marks at each step, dismissible, remembered per user
  - [ ] Preview toggle shows the card in Arabic and English; a missing Arabic name or bio shows an "add Arabic" prompt on the card
  - [ ] Photo step copy asks for a recent professional photo; no biometric or facial recognition wording anywhere
  - [ ] Credentials upload to the private `credentials` bucket via signed URLs; max 20 MB per file; PDF and images only; the card shows them as "pending verification"
  - [ ] Publish checklist (photo, details, credentials, under review, live) replaces the ikioo invite circles; submitting sets `review_status = pending` and emails the doctor "claim received" in their locale
  - [ ] A patient account attempting to read a credential object gets 403 (test)

### Task 2.5: Profile builder: fields and expertise tags
- **Depends on:** 2.4
- **Not in this task:** availability
- **Done when:**
  - [ ] Editable in the builder: title and name (ar, en), bio (ar, en), training history, languages and Arabic dialect, fees per visit type in USD, visit types (video, in person in the US), age groups, video link, US state and city picker
  - [ ] Expertise tags: up to 10, title max 30 characters, nugget max 500, text only, reorderable; shown on the card as one tinted pill style
  - [ ] Fee change writes old and new values to `audit_log`; public page updates within one minute
  - [ ] Validation errors shown inline in the active locale

### Task 2.6: Availability editor
- **Depends on:** 2.5
- **Not in this task:** holds, checkout
- **Done when:**
  - [ ] Weekly rules, date exceptions, IANA timezone and slot length (default 30 minutes) saved; stored as UTC instants plus the rule timezone
  - [ ] `lib/slots.ts` generates slots for a date range; tests cover Chicago to Riyadh, Chicago to Dubai, Chicago to London, and the 1 Nov 2026 US DST boundary
  - [ ] Preview on the public profile matches the generator for a viewer in Asia/Riyadh

### Task 2.7: Practice ID card renderer
- **Depends on:** 2.5; the featured card on the theme board; the ikioo sign-up PNGs and the banner PDF from 14 Oct as references
- **Not in this task:** banner purchase
- **Done when:**
  - [ ] `GET /api/cards/[id].png` renders the same DoctorCard used by the builder preview, in the active locale, using the brand tokens
  - [ ] Card regenerates on profile change; cached one hour

### Task 2.8: Admin review queue, listings, specialties, removals, audit
- **Depends on:** 2.4, 1.7
- **Not in this task:** payments screens
- **Done when:**
  - [ ] Admin routes require role `admin` and TOTP; a test without TOTP is refused
  - [ ] Review queue: approve sets `verified` plus review date and lifts "pending verification" from the card; reject with reason emails the doctor and allows resubmission
  - [ ] Listings table with status filter and edit; specialty list editable; removal requests with a 48-hour SLA timer; audit log viewer with filters
  - [ ] Every admin action writes to `audit_log` with actor, target, old and new

### Task 2.9: Introduction inbox and transactional email set
- **Depends on:** 2.5, 1.10
- **Not in this task:** booking emails
- **Done when:**
  - [ ] Professional sees introduction requests (`introduction_requests` rows: open, booked, declined, withdrawn; the professional declines an open one; placeholder until M3 bookings exist) with empty state
  - [ ] Templates in both locales: invite, OTP, claim received, approved, rejected, removal confirmed; each renders RTL correctly in Gmail and Outlook test sends

## Milestone 3: Booking, payments, memberships, records AI, intake

### Task 3.1: Connect Express onboarding
- **Depends on:** 1.8, 2.5
- **Not in this task:** charges
- **Done when:**
  - [ ] "Set up payouts" opens a Stripe-hosted onboarding link; return and refresh URLs handled
  - [ ] `account.updated` webhook stores `charges_enabled` and `payouts_enabled`; the book button is hidden until both are true
  - [ ] Admin sees connected account status per professional

### Task 3.2: Slot holds and checkout
- **Depends on:** 2.6, 3.1
- **Not in this task:** refunds
- **Done when:**
  - [ ] Selecting a slot inserts `slot_holds` with a unique constraint on (professional_id, slot_start) and expiry 10 minutes **(default until Q-8)**
  - [ ] PaymentIntent created with destination charge, `application_fee_amount` = platform fee 10% **(default until Q-8)**, metadata `hold_id`; checkout shows doctor fee, platform fee and card processing as separate lines that sum to the intent amount
  - [ ] A second patient selecting the held slot sees it unavailable; the slot picker takes busy times from `rpc('professional_busy_times')` (live holds and bookings, no patient details)
  - [ ] Minute cron releases expired holds; an expired hold refuses payment and Stripe shows no charge

### Task 3.3: Booking confirmation from webhook
- **Depends on:** 3.2
- **Not in this task:** reminders (January)
- **Done when:**
  - [ ] `payment_intent.succeeded` handler, inside one transaction: verify hold unexpired, create booking, consume hold, write receipt; duplicate delivery produces exactly one of each (test)
  - [ ] Confirmation emails to both parties with .ics and the professional's video link; local times correct across the four timezone test cases
  - [ ] Introduction inbox now shows real bookings beside the open `introduction_requests`; when a request is paid, the handler sets its `booking_id`, status `booked` and `answered_at`

### Task 3.4: Cancellations and refunds
- **Depends on:** 3.3
- **Not in this task:** memberships; 24h and 1h reminders (moved to January, change log 16 Oct)
- **Done when:**
  - [ ] Cancellation rules from `config/business.ts` **(default until Q-8: full refund more than 24h before, none after)**
  - [ ] Admin refund action creates a Stripe refund with `reverse_transfer`; `charge.refunded` marks the booking and adds a receipt line

### Task 3.5: Memberships and banner via Stripe Billing
- **Depends on:** 3.1
- **Not in this task:** custom invoice UI; home banner carousel (moved to January, change log 16 Oct)
- **Done when:**
  - [ ] Products and prices created in Stripe for monthly, yearly and banner add-on **(amounts default until Q-8; banner USD 9.99 per month as earlier mentioned)**
  - [ ] Hosted Checkout starts a subscription; Customer Portal link in the portal handles changes and cards
  - [ ] Webhooks maintain `memberships.status` and `banners.active`; `past_due` keeps the profile live for the grace period **(default until Q-8: 7 days)**
  - [ ] Banner purchase is hidden in the portal until the carousel ships, unless Dr Ayman asks to presell it

### Task 3.6: Patient portal core
- **Depends on:** 3.3
- **Not in this task:** records
- **Done when:**
  - [ ] OTP sign-up and login; bookings list with status; receipts with itemised lines; settings (locale, timezone, delete account)
  - [ ] Delete account keeps every booking, receipt, refund and introduction request line without who it was (first names, phone and transcript removed; the concern stays) and is refused while an upcoming visit is not cancelled and refunded (20 Oct; test)
  - [ ] A patient cannot fetch another patient's booking or receipt (test returns 404)

### Task 3.7: Records upload, validation and quote
- **Depends on:** 1.9, 3.6
- **Not in this task:** extraction
- **Done when:**
  - [ ] Upload via signed URLs to `records/{patient_id}/{set_id}/`; limits 50 MB per file, 2 GB per set; PDF, DOCX, JPG, PNG
  - [ ] Inngest `records.validate` computes accepted bytes and page count; rejected files listed with reasons
  - [ ] Quote = ceil(accepted bytes / 1 GB) × USD 9.99 **(from the content document)**; 1.3 GB shows USD 19.98; consent checkbox recorded in `consents` before payment
  - [ ] Nothing is processed before `payment_intent.succeeded` for the quote

### Task 3.8: Extraction pipeline
- **Depends on:** 3.7; the spike verdict (OCR step yes or no)
- **Not in this task:** viewer UI
- **Done when:**
  - [ ] Inngest `records.process`: per-page extraction with concurrency 4, backoff with jitter, three attempts, then job `failed` with reason; no capture on failure; retry reuses the quote (test)
  - [ ] Output validated against `PageExtraction`; invalid output retried then failed, never partially written
  - [ ] Every `record_items` row carries `source_page_id`; unreadable pages produce an `unreadable` item with the page reference
  - [ ] Injection fixture (a page containing instructions to the model) yields schema-valid output with no instruction-following content
  - [ ] `ai_calls` rows show tokens and cost per page; daily spend alert fires at the threshold in `config/business.ts`

### Task 3.9: Dedupe, summary, timeline, flags
- **Depends on:** 3.8
- **Not in this task:** sharing
- **Done when:**
  - [ ] Two scans of the same report produce one item with two sources (fixture test)
  - [ ] Summary: one-page overview plus dated timeline of diagnoses, procedures, medications, allergies, results; each item links to its source page
  - [ ] Missing-record checker lists expected but absent documents (for example, imaging referenced in a note but not uploaded); conflicts (two different values for the same item) flagged with both sources
  - [ ] No item exists without a source page (database constraint)

### Task 3.10: Summary viewer, sharing, deletion
- **Depends on:** 3.9
- **Not in this task:** other agents
- **Done when:**
  - [ ] Viewer shows overview, timeline, flags, and opens the source page on click; loading state shows file list and progress per page
  - [ ] Share creates a share for one chosen professional with expiry **(default until Q-13: 30 days)**; a different professional or an expired share is refused (test)
  - [ ] Records files open only through signed URLs that server code mints after checking the share is live (10 minutes, `storageRules.recordsSignedUrlSeconds`); a professional's own client reads no records object (test)
  - [ ] Professional's shared-summaries viewer lists shares received
  - [ ] Delete removes files, items, summaries and shares; `audit_log` keeps only the event (test asserts no content remains)

### Task 3.11: Admin payments, refunds, AI jobs
- **Depends on:** 3.4, 3.8
- **Not in this task:** dashboards
- **Done when:**
  - [ ] Tables: payments, refunds, payouts (from Stripe API), memberships, banners, AI jobs with tokens and cost, with filters and CSV export
  - [ ] Refund action from the payments table; AI job retry action for failed jobs

### Task 3.12: Light intake chat (launch version of agent 12)
- **Depends on:** 1.9 (lib/ai), 2.1 (specialty list and search), 3.6 (patient accounts)
- **Not in this task:** the full website chatbot, any clinical advice, free-form general Q&A
- **Done when:**
  - [ ] Chat on the public site in both locales asks a short guided set of questions (concern, age group, preferred language, video or in person) and returns one to three of the 104 specialty groups with matching verified doctors
  - [ ] Ends by opening the introduction request pre-filled; the patient can edit before sending
  - [ ] System prompt and output schema forbid diagnosis, treatment or medication advice; a fixture set of 20 prompts asking for advice returns the referral path only (test)
  - [ ] Consent shown before the first question; transcript stored with the request in `introduction_requests.transcript` (the consent in `consent_id`), deletable by the patient; `audit_log` row per session
  - [ ] Token cap per session from `config/business.ts`; calls logged to `ai_calls`
  - [ ] Fallback: if the model call fails, the same questions run as a guided form with no model

## Milestone 4: Production, security review, launch

### Task 4.1: Production server and migration
- **Depends on:** open question 4 (server provider and account) by 20 Nov
- **Not in this task:** feature work
- **Done when:**
  - [ ] Supabase stack running on the production host; app pointed at it; `3affya.com` on SSL
  - [ ] Auth (20 Oct): email autoconfirm off; the reverse proxy refuses `POST /auth/v1/signup` and `POST /auth/v1/token?grant_type=password`; the app signs in by email code only
  - [ ] Hardening checklist from the architecture file executed; output committed to `ops/hardening_2026-12.md`
  - [ ] Nightly encrypted backup to object storage in a separate account; restore drill passed and logged

### Task 4.2: Security review
- **Depends on:** 4.1
- **Not in this task:** new features
- **Done when:**
  - [ ] `tests/rls` passes against production config; dependency scan shows zero critical; secrets review finds none in repo or bundle (`grep` and bundle analysis)
  - [ ] Rate limits verified on OTP, claim, upload, checkout, intake chat; signed URL expiry verified at 10 minutes
  - [ ] Smoke check against production: a password sign-up is refused

### Task 4.3: Bilingual QA script
- **Depends on:** 4.1
- **Not in this task:** fixes beyond blocking defects
- **Done when:**
  - [ ] Playwright script walks patient (including intake chat), professional (including the builder on phone width) and admin journeys in both locales; zero blocking defects; known minor defects listed in `ops/known_defects.md`
  - [ ] Legal pages (privacy, terms, fees, refunds) present in both locales and sent to Dr Ayman's lawyer

### Task 4.4: Live-mode rehearsal
- **Depends on:** Stripe live mode (open question 7)
- **Not in this task:** anything else
- **Done when:**
  - [ ] Nominal live booking made and refunded between test accounts; money moves and returns in Stripe
  - [ ] If live mode is not available, launch proceeds in test mode with a dated switch recorded in the overview change log

### Task 4.5: Runbook, handover, outreach pack
- **Depends on:** 4.1 to 4.4
- **Not in this task:** sending outreach
- **Done when:**
  - [ ] `ops/runbook.md`: restart, restore, rotate secrets, scale, alerts, who to call
  - [ ] Handover checklist signed by Dr Ayman: owner access on every account, ProgrammX operator access under the retainer, transfer plan for Vercel, Inngest, Resend and the repo
  - [ ] Outreach pack: 66k list (its 28,584 doctors have a listing and a card to claim; students and other professions have none since 20 Oct), invite email template in both locales (leading with "your card is already made"), invite tracking screen, and the note that sending waits on counsel (open question 6)

### Task 4.6: Launch
- **Depends on:** 4.5
- **Done when:**
  - [ ] Production deploy on Friday 4 December; uptime monitor green; Dr Ayman notified with the handover summary
  - [ ] Actual days per milestone recorded in the milestones file timeline summary

---
ProgrammX · programmx.com · hello@programmx.com
