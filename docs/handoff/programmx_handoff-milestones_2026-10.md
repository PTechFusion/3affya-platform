# 3affya Launch Platform: Milestones
`Confidential`

**Start:** Monday 19 October 2026 · **Launch:** Friday 4 December 2026 · **Cadence:** demo to Dr Ayman at the end of each milestone; 30-minute checkpoint after M1; weekly written status from Yasir on Fridays · **Payments:** USD 2,500 in Oct, Nov, Jan, Feb · **Updated:** 17 Oct (light intake trade, profile builder); 20 Oct (doctors-only directory, 28,584 listings)

## Milestone 1: Foundation, prototype and spikes (19 to 23 Oct)

Spikes the riskiest assumptions: Arabic scan extraction quality, RTL layout across the component set, ISR build and sitemap behaviour at the 28,584 directory pages (doctors only since 20 Oct).

- **Deliverables:**
  - Repo with Next.js, TypeScript, Tailwind, `next-intl` (`/ar` default, `/en`), `dir` switching, logical CSS only, ESLint rule banning physical direction utilities.
  - Brand system at `/brand`: theme draft 1 (17 Oct) with tokens from the 3affya logo (deep sea, aqua, gold, sand, ink), Readex Pro type scale, Arabic and Latin font pairing, components (button, input, card, table, dialog, nav, empty state, loading state, and the doctor card used by the builder preview, search and ID card). The ikioo sign-up screens are the reference for the onboarding flow only; their colours and type are not used.
  - Deployed clickable prototype: home, why US training, how it works, specialty directory, search results, doctor profile (claimed and unclaimed states), AI tools teaser, for professionals, FAQ, about, contact; patient, professional and admin portal shells with navigation and empty states; the professional profile builder as a clickable flow (form plus live card). Every page has something to look at while it loads and a reason to stay (standing design rule).
  - Self-hosted Supabase dev stack on the VPS via Docker Compose; schema v1 migrations; RLS policies for every table with cross-tenant tests.
  - Seed: the shortlist's 28,584 doctor rows imported (physicians and dentists; students and other professions get no profile, 20 Oct); NPPES taxonomy mapped to the 104 groups, named with the content document's card titles; mapping exceptions listed for Dr Ayman.
  - Stripe account created under Dr Ayman, test mode, Connect enabled; webhook endpoint stub with `stripe_events` idempotency.
  - Anthropic HIPAA-ready API organisation requested in Dr Ayman's name; `lib/ai` client with vendor switch, pinned model, schema validation and cost logging.
  - Spike report: five real documents (two Arabic, two English, one low-resolution scan) run through extraction; written verdict on accuracy, cost per page, latency, and whether a dedicated OCR step is needed.
  - DNS: `mail.3affya.com` verified in Resend.
- **Definition of done:**
  - Given the prototype URL, When Dr Ayman opens it on phone and desktop in both languages, Then every listed page renders with no clipped or mixed-direction text and he records approval in writing by 23 Oct.
  - Given `npm run lint`, When run, Then zero physical direction utilities exist in the codebase.
  - Given the dev Supabase stack, When the RLS test suite runs, Then every cross-tenant read and write returns a permission error.
  - Given the seed script, When run twice, Then the second run changes zero rows (idempotent) and the row count equals the shortlist's doctor rows (28,584).
  - Given an unmapped NPPES taxonomy code, When the mapping runs, Then it lands in an exceptions file rather than defaulting silently.
  - Given a Stripe test event sent twice, When the webhook receives both, Then one `stripe_events` row exists and both requests return 200.
  - Given the five spike documents, When processed, Then the report lists per-document accuracy against a hand check, tokens, cost and latency, and names the pipeline shape for M3.
  - Given the full seed, When `next build` runs with ISR, Then build completes in under 15 minutes and the sitemap is split into files of at most 5,000 URLs.
- **Depends on:** VPS access; GoDaddy DNS; Dr Ayman's reaction to theme draft 1 (overview Q18); the five real documents (Yasir supplies synthetic or own documents if Dr Ayman cannot by Wednesday).
- **Target date:** Fri 23 Oct · **Slip risk:** late feedback on the theme board; Anthropic org request is not a blocker for M1 because the spike can run on a standard key with synthetic documents.

## Post-Milestone-1 checkpoint

**Date:** Mon 26 Oct, 30 minutes · **Agenda:** fold the spike verdict into ADR-3 and ADR-4 (OCR step yes or no; vendor confirmed or Bedrock); re-cut M3 if the pipeline shape changed; close or escalate open questions 15 and 18; log M1 actual days against the 5-day window as the first reference-class entry.

## Milestone 2: Directory, claim flow, professional portal, admin review (26 Oct to 13 Nov)

- **Deliverables:**
  - Public directory: specialty index (104 groups), search with filters (specialty, language, location, visit type, age group), featured-first ordering, pagination, empty states with suggestions.
  - Profiles: unclaimed state (registry label, invite, remove-me) and claimed-verified state (bio, training, languages, fees, visit types, age groups, availability preview, book button).
  - Invite tokens, invite tracking table and admin screen; claim flow; OTP sign-up.
  - Profile builder (ikioo flow, 17 Oct): one split screen where the doctor fills the form and their card builds live beside it; coach marks per step; pre-filled from the registry; Arabic and English preview; credential upload with "pending verification" until approved; up to 10 text expertise tags; publish checklist (photo, details, credentials, under review, live). Covers onboarding, credentials, profile editing and the practice ID card.
  - Availability editor (weekly rules, exceptions, timezone, slot length); practice ID card rendered as an image from the same card component; introduction inbox.
  - Admin: credential review queue with approve, reject with reason, verification date; listings management; specialty list; removal requests with SLA timer; audit log viewer.
  - Transactional email in both languages: invite, OTP, claim received, approved, rejected, removal confirmed.
- **Definition of done:**
  - Given filters specialty, language and visit type, When applied, Then results match a SQL query with the same predicates and only `verified` rows appear.
  - Given an unclaimed profile, When fetched via the page or the public API, Then the response contains no fee, availability, checkout or contact fields.
  - Given a valid invite token, When opened, Then the profile builder loads with the doctor's registry fields pre-filled; given an expired, used or forged token, Then a clear message and a request-new-invite action appear.
  - Given the profile builder, When the doctor edits any field, Then the card preview updates within one second, and on phone width the card shows as a sticky mini preview above the form with no sideways overflow.
  - Given credentials uploaded but not approved, When the card is viewed anywhere, Then certifications read "pending verification" and none are listed publicly.
  - Given a claim with credentials, When admin approves, Then status is `verified`, the review date shows publicly, and the profile is bookable; when admin rejects with a reason, Then the doctor sees the reason and can resubmit.
  - Given a professional in America/Chicago sets Tuesday 9:00 to 12:00 with 30-minute slots, When the availability preview is viewed from Asia/Riyadh, Then six slots show 18:00 to 20:30 Riyadh time; given a date exception, Then no slots show that day.
  - Given a remove-me request, When admin confirms, Then the page returns 410, the sitemap entry is gone on next generation, and the audit log records who confirmed.
  - Given a professional edits their fee, When saved, Then the public page shows the new fee within one minute and the audit log records old and new values.
  - Given any admin route, When accessed without TOTP, Then access is refused.
- **Depends on:** M1 approval. Arabic strings are AI-drafted from the content document and corrected by Dr Ayman in preview, so nothing waits on copy.
- **Target date:** Fri 13 Nov · **Slip risk:** admin surface creep; keep admin to tables and actions, no dashboards until M4.

## Milestone 3: Booking, payments, memberships, records AI, intake (9 to 27 Nov, overlaps M2 by one week)

- **Deliverables:**
  - Stripe Connect Express onboarding link from the professional portal; payouts handled by Stripe; connected account status in admin.
  - Booking: slot hold, checkout with fee breakdown (doctor fee, platform fee, card processing), PaymentIntent with destination charge and application fee, confirmation with .ics and video link, cancellation and refund rules per policy, receipts. (24h and 1h reminders moved to January, change log 16 Oct.)
  - Memberships (monthly, yearly) and banner add-on via Stripe Billing Checkout and Customer Portal; membership and banner status in admin. (Home banner carousel moved to January, change log 16 Oct.)
  - Patient portal: sign-up and login, bookings, receipts, records upload with quote, summary and timeline viewer with source links, consent and sharing, settings.
  - Records pipeline (ADR-4) with agents 1, 6 and 7: validation, quote, pay, per-page extraction, dedupe, summary, timeline, missing and conflict flags, unreadable flags, deletion, sharing with one chosen professional via expiring link; professional's shared-summaries viewer.
  - Light intake chat (launch version of agent 12) on the public site in both languages: suggests a specialty and pre-fills the introduction request; no medical advice; consent and audit log.
  - Admin: payments, refunds, payouts view, AI jobs with tokens and cost, daily AI spend alert.
- **Definition of done:**
  - Given a selected slot, When checkout opens, Then a hold exists with a 10-minute expiry, the three fee lines sum to the PaymentIntent amount to the cent, and a second patient selecting the same slot sees it unavailable.
  - Given the hold expires, When payment is attempted, Then it is refused, the slot is free, and Stripe shows no charge.
  - Given `payment_intent.succeeded` delivered twice, When processed, Then one booking, one receipt and one notification exist.
  - Given a booking on 3 Nov 2026 between America/Chicago and Asia/Riyadh, When confirmations are sent, Then each party's email shows the correct local time after the US DST change on 1 Nov 2026; the same test passes for Europe/London and Asia/Dubai.
  - Given admin issues a refund, When Stripe confirms, Then the booking is `refunded`, the receipt shows a refund line, and the connected account's share is reversed.
  - Given 1.3 GB of accepted files, When the quote is requested, Then it shows USD 19.98 and no job starts before `payment_intent.succeeded`.
  - Given a processed set, When the summary opens, Then every item links to its source page and opens it; given two scans of the same report, Then one item with two sources; given a blurry page, Then an "unreadable" flag with the page reference.
  - Given a failure on page 7 of 30 after three retries, When the patient checks, Then the job is `failed` with a plain reason, nothing was captured, and retry reuses the original quote.
  - Given patient B requests patient A's set, When the request is made, Then 404 and an audit row.
  - Given a deletion, When complete, Then files, items, summary and share links are gone, and the audit log holds only the event.
  - Given a share link, When opened after expiry or by a different professional, Then access is refused.
  - Given a membership renewal failure, When Stripe dunning runs, Then the profile stays live through the configured grace period and admin sees `past_due`.
  - Given a document containing text that instructs the model to ignore its task, When processed, Then the output still validates against the schema and contains no instruction-following content.
  - Given a patient describes a problem in the intake chat in Arabic, When the chat ends, Then it suggests at least one of the 104 specialty groups, opens the introduction request pre-filled, gives no diagnosis or treatment advice, and writes a consent and audit row.
- **Depends on:** M2 profiles and availability; Stripe test mode (live mode by 7 Nov for a live-mode rehearsal); AI vendor confirmed at the checkpoint; open questions 8, 12, 13 by 7 Nov (defaults in the tasks file apply until then).
- **Target date:** Fri 27 Nov · **Slip risk:** this is where the plan breaks if it breaks; the checkpoint exists to re-cut it. Reminders and the carousel have already moved to January; if extraction needs a separate OCR step, the intake chat falls back to a guided form (no model) for launch.

## Milestone 4: Production, security review, launch (30 Nov to 4 Dec)

- **Deliverables:**
  - Production server in Dr Ayman's name with the hardening checklist passed; Supabase stack and data migrated (no real PHI exists before this point); Vercel production pointed at it; `3affya.com` live with SSL.
  - Bilingual QA pass with a scripted walkthrough per portal; defect list closed.
  - Security review: RLS tests, dependency scan, secrets review, rate limits, OTP abuse test, signed URL expiry test, password sign-up refused in production (email code sign-in only, 20 Oct).
  - Legal pages (privacy, terms, fees, refunds) in both languages for Dr Ayman's lawyer; analytics; uptime monitoring; alerts.
  - Runbook, handover checklist, account transfer plan (Vercel, Inngest, Resend, repo), outreach pack (66k list, of which the 28,584 doctors have a listing to claim; invite template, invite tracking).
  - Launch on Friday 4 December.
- **Definition of done:**
  - Given the hardening checklist, When executed on the production host, Then every item passes and the output is attached to the handover.
  - Given last night's backup, When restored to a fresh instance, Then the app starts and a known test booking is present.
  - Given the QA script, When run in both languages, Then zero blocking defects remain and the list of known minor defects is in the handover.
  - Given the RLS suite and dependency scan, When run against production config, Then zero failures and zero critical vulnerabilities.
  - Given a professional and a patient test account, When a live-mode booking of a nominal amount is made and refunded, Then money moves and returns correctly in Stripe.
  - Given the handover checklist, When Dr Ayman signs it, Then he has owner access to every account and ProgrammX retains operator access under the retainer.
- **Depends on:** production server (open question 4) by 20 Nov; Stripe live mode (open question 7); counsel's PHI answer (open question 5) requested by 20 Nov so it lands with the security review.
- **Target date:** Fri 4 Dec · **Slip risk:** server or Stripe approval late; in that case launch proceeds in test mode with a dated switch to live.

## Batches 2 and 3 (January and February, with payments three and four)

Scoped at the January checkpoint, not now. Carried over from launch: 24h and 1h booking reminders, the home banner carousel (banner sales start with it), and media on expertise tags. Candidate agent order from the content document: translation and consultation preparation (agents 4, 5), instruction explainer and task organiser (9, 10), consent-aware sharing and guided search (11, 8), then medication comparison (2) and English correspondence (3), and the full website chatbot (12, beyond the launch intake). Each needs a price decision from Dr Ayman before it goes live. Possible growth feature: peer referral reward ("invite 3 colleagues, get a free month").

## Timeline summary

| Milestone | Target | Reference-class basis | Depends on |
|-----------|--------|----------------------|-----------|
| 1 | 23 Oct | No comparable ProgrammX bilingual marketplace in the record; window is appetite-driven; the 26 Oct checkpoint logs the first actual | Theme board feedback |
| 2 | 13 Nov | No comparable; 15 working days solo for about 22 screens plus admin, hosted pages excluded (profile builder merges five professional screens into one) | M1 |
| 3 | 27 Nov | No comparable; the highest-risk window; re-cut at checkpoint | M2, Stripe, AI vendor |
| 4 | 4 Dec | Comparable to past ProgrammX launches on client infrastructure; 5 days is tight but bounded | M3, server, Stripe live |

At project close, record actual days per milestone here; that log is the reference class for the next build of this kind.

## Change protocol

Any mid-build request from Dr Ayman is written into the overview's change log the day it arrives and answered within two working days with one of: an in-appetite trade ("we can add X by moving Y to January"), a re-scope with a price, or a decline with the reason. Nothing is absorbed silently.

---
ProgrammX · programmx.com · hello@programmx.com
