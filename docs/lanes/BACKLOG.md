# Lane backlog (from the wave reviews)

What the reviews of lanes L1 to L5 (23 Oct 2026) found and left for a later lane, by lane. Fixed items are not listed; the
reconciliation commit on `dev` has them. Severity is the reviewer's.

## L1 schema and RLS
- medium (three items): direct client writes that carry business numbers (`audit_log` inserts, `slot_holds` spans,
  `record_shares.expires_at`, `introduction_requests.transcript`). Closed by L6's first migration; see
  `L6-data-wiring.md`, "Notes from the wave review".
- low: anonymous SELECT on `professionals` is table-wide (`user_id`, `reviewed_by`, review and removal instants visible);
  shared reads of `record_sets` and `record_files` expose `quote_cents`, `payment_intent_id`, `sha256`. Column grants or
  views, with L6.
- low: `private.is_time_zone` scans `pg_timezone_names` on every insert it checks (six columns). A `private.time_zones`
  table filled once, checked by index.
- low: `removal_requests.npi` check `^[0-9]{10}$` differs from `professionals.npi` `^[12][0-9]{9}$`. Same pattern.
- after L6's migration: `npm run db:types`, then `lib/stripe/types.ts` and lib/ai's row types switch to the generated types.

## L2 Stripe webhook
- low: a type with no handler keeps `handled_at` null by design, so `stripe_events_unhandled_idx` fills with by-design rows
  once the endpoint subscribes to more types than it handles. L0 subscribes the Dashboard endpoint to handled types only;
  M3's admin view adds a "no handler" marker if needed.
- low: the migration was applied by hand on one dev stack without a `schema_migrations` row; `supabase db reset` there.
- M3 (tasks 3.3, 3.4): the booking email is sent from an Inngest step the handler enqueues, never from inside the webhook
  request (10 s Resend call). Decide before 3.3 starts.
- L0: a 409 counts as a failed delivery in Stripe's endpoint health; rare by construction, expected, not a bug.

## L3 AI client
- low: near the per-job cap a call is still sent with `max_tokens` clamped to `MIN_CALL_TOKENS` (1,024), which cannot hold a
  page; the input is paid for and the call fails on `max_tokens`. Refuse with `token_cap` when the remainder is below a
  per-step floor, and do not count that failure toward the circuit.
- low: `checkPage` accepts any PDF as one page; count `/Type /Page` objects and refuse more than one as `bad_input` until
  task 3.7's splitter exists.
- low: `INJECTION_NOTE` is English in Arabic sets; localise per locale and let the spike accept either form.
- low: a good answer whose `ai_calls` row cannot be written is discarded; retry the idempotent upsert once before
  `log_failed`.
- low: invalid model output counts toward the process-wide circuit; count vendor-side failures only, or document the choice.
- task 3.8: `MAX_ITEMS_PER_SUMMARY` 5,000 allows a very large single summary call; a lower ceiling in `config/business.ts`.
- fleet-wide cap and circuit (database-backed) if the pipeline runs on more than one instance.

## L4 email templates
- low: `claim-invite-copy.ts` imports `sampleAdmin` and `doctorTimeZone` from lib/sample as fallbacks for screen 46's
  preview; make the context required and drop the import when L6 replaces the sample shape.
- low: `booking-confirmed.ts` uses the professional's `joinUrl` as given; the builder (L6) validates `https://` before
  storing it.
- asset: `public/brand/3affya_wordmark_transparent.png` is 772 KB and every email loads it; an email-sized PNG (about
  216 x 72) in `public/`.
- `scripts/screenshots.mjs` fails on Windows (`new URL(...).pathname` gives `/C:/...`); fix the path handling.
- `tsx` as a pinned devDependency for `scripts/*.ts`, or keep `npx --yes tsx@4.23.15`.

## L5 quality and CI
- KD-001: build `/intake` as the full-page intake chat (task 3.12) or drop it from the route map.
- KD-007 to KD-014 remain in `ops/known_defects.md` (registry line contrast, dev bar contrast, brand page scroll box,
  landmarks, intake sheet roles, 0 MB file sizes, card back face by eye).
- RLS suite in CI: a second job that runs `supabase start` (3 to 4 minutes) on every PR, or nightly.
- One unit for file sizes (credentials binary MB, records SI MB).
