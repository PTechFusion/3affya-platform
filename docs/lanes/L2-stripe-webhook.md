# L2. Stripe test account and webhook stub — branch `lane/stripe-webhook` — task 1.8

**Depends on:** nothing for the code; Stripe test keys (L0 item 2) for the `stripe trigger` verification.
**Not in this lane:** charges, Connect onboarding, Billing, any page. Those are M3 tasks 3.1 to 3.5 and build on this handler.

## Read
Architecture: Critical flow 4 (webhooks), ADR-6 (money), Rigor review (timeouts, idempotency). Task 1.8. CLAUDE.md Stripe
rules: insert into `stripe_events` before handling; on conflict return 200 and stop; money state written only from webhooks.
`lib/stripe-dashboard.ts` (exists; the admin screens link to the dashboard through it).

## Deliverables
- `supabase/migrations/<ts>_l2_stripe_events.sql`: `stripe_events(event_id text primary key, type text, created_at
  timestamptz, received_at timestamptz default now(), payload jsonb, handled_at timestamptz, error text)`. RLS enabled,
  no policies (service role only). This lane owns the table.
- `app/api/stripe/webhook/route.ts`: `POST` only. Reads the raw body, verifies the signature with `STRIPE_WEBHOOK_SECRET`,
  inserts the event row first, returns 200 immediately on a duplicate key, then dispatches to a pure handler by event type.
  Unknown types are stored and acknowledged. Handler errors are recorded on the row and return 500 so Stripe retries;
  signature failures return 400. Never logs the payload.
- `lib/stripe/client.ts`: one Stripe client, API version pinned in code, 20 s timeout, keys from env only.
- `lib/stripe/handlers.ts`: a registry `{ [eventType]: (event, db) => Promise<void> }` with `payment_intent.succeeded`
  as a no-op that records the amount into the event row's `handled_at`, so M3 handlers slot in without touching the route.
- `tests/unit/stripe/webhook.test.ts`: signature verification with a Stripe test signature, duplicate event returns 200
  without a second handler call, handler error marks the row and returns 500. Mock the database layer.
- `scripts/stripe-trigger-twice.sh`: runs `stripe trigger payment_intent.succeeded` twice against a local server and counts
  rows, for the done-when check.

## Done when (task 1.8)
- [ ] `POST /api/stripe/webhook` verifies the signature, inserts `stripe_events(event_id)`, returns 200 on duplicate
- [ ] `stripe trigger payment_intent.succeeded` twice results in one row (mark not run if no keys yet)
- [ ] Keys read from env only; `grep -rn sk_ --include=*.ts . | grep -v node_modules` prints nothing
- [ ] Unit tests pass; `npm run check` green

## Notes
- Allowed additions: `stripe` (pinned). The Stripe CLI is a local tool, not a dependency.
- `.env.example`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`.
- Route handlers in the App Router must read `request.text()` for the raw body; set `export const runtime = "nodejs"`.
- Until L1 merges, declare the `StripeEventRow` type in `lib/stripe/types.ts`; switch to `lib/db/types.ts` after.

## Notes from L1 (20 Oct 2026)
- `stripe_events` is this lane's own migration, with a timestamp after `20261020001000` (L1's run `20261020000100` to
  `20261020001000`).
- Money rows are written only by the webhook, through `createServiceClient({ kind: "system", name: "stripe-webhook" })`.
- `receipts` and `refunds` have `subject` 'booking' | 'records' (records-processing payments, task 3.7): `booking_id`
  only on 'booking', `record_set_id` only on 'records'.
- `account.updated` writes `professional_private.stripe_*`; a trigger keeps `professionals.can_take_bookings` in step.
- System audit rows must set `actor_system` (e.g. 'stripe').
- A paid introduction request: set `introduction_requests.booking_id`, status 'booked' and `answered_at`.
- Run the done-when key grep in the word-boundary form, `grep -rnE '\bsk_' --include=*.ts . | grep -v node_modules`
  (README section 4); the plain `sk_` form matches `task_` in the `.netlify/` build output.
