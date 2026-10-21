-- L2 (task 1.8): stripe_events, the Stripe webhook's idempotency ledger (architecture, critical flow 4; ADR-6).
--
-- POST /api/stripe/webhook verifies the signature, then inserts the event here BEFORE any handler runs:
--   insert ... on conflict (event_id) do nothing returning event_id
-- No row back means Stripe delivered an event already on file. Handled (or of a type nothing handles): the route answers
-- 200 and stops, so a redelivery never reaches a handler a second time. Never handled: the row is taken back for one more
-- attempt when its last attempt is over, by a single conditional update
--   handled_at is null and (error is not null or attempted_at < now - 5 minutes)
-- that also moves attempted_at, so two concurrent retries cannot both run the handler. That keeps "return 500 so Stripe
-- retries" meaningful (a recorded error), and it recovers an attempt that died without recording anything (process killed,
-- the insert's response lost, the database gone when the error was written). An attempt younger than that is still
-- running: the route answers 409 and Stripe retries later.
--
--   event_id     Stripe's event id (evt_...), the primary key the idempotency rests on.
--   type         the event type, e.g. payment_intent.succeeded.
--   created_at   when Stripe created the event (event.created), not when it reached us.
--   received_at  the first delivery that reached the route.
--   attempted_at when the latest attempt started: the first delivery, or the retry that took the row back. Set by the
--                route (STALE_ATTEMPT_MS in lib/stripe/webhook.ts is the five minutes above).
--   payload      the verified event as Stripe sent it. It can hold customer details: service role only (below), and the
--                route never logs it. Kept so a later handler can replay an event without asking Stripe again.
--   handled_at   when a handler for this type finished. Null for a type with no handler yet (stored and acknowledged),
--                for an attempt still running, and for a failed one.
--   error        the last failed attempt's error (name and message, truncated by the route); cleared when it succeeds.
--
-- Service role only. No API role may read or write this table: every privilege is revoked from anon and authenticated
-- (Supabase's default privileges would otherwise grant them everything on a new public table), RLS is on, and an
-- explicit restrictive policy denies both roles all access, so the table never depends on "no permissive policy" alone.
-- The webhook reaches it through createServiceClient({ kind: "system", name: "stripe-webhook" }) (lib/db/client.ts).

create table public.stripe_events (
  -- Loose checks on purpose: a row that fails one is a 500 Stripe retries for three days, so they only catch garbage.
  event_id text primary key check (event_id ~ '^evt_' and char_length(event_id) <= 255),
  type text not null check (char_length(type) between 1 and 255),
  created_at timestamptz not null,
  received_at timestamptz not null default now(),
  attempted_at timestamptz not null default now(),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  handled_at timestamptz,
  error text check (char_length(error) <= 2000)
);

comment on table public.stripe_events is
  'Stripe webhook idempotency ledger (lane L2, task 1.8). Inserted before handling; service role only.';

-- Events that never finished: the admin view of stuck or failed deliveries and a later replay job read these.
create index stripe_events_unhandled_idx on public.stripe_events (received_at) where handled_at is null;
create index stripe_events_type_created_idx on public.stripe_events (type, created_at);

alter table public.stripe_events enable row level security;

revoke all on table public.stripe_events from public, anon, authenticated, service_role;
-- What the webhook uses (insert, the handled check and the returning selects, the reclaim and the handled/failed
-- updates), plus delete for retention purges and test cleanup. No truncate.
grant select, insert, update, delete on table public.stripe_events to service_role;

-- Service role only: anon and authenticated are denied everything, whatever permissive policy might be added later.
create policy stripe_events_deny_api_roles on public.stripe_events
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
