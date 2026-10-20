-- L1 schema v1, file 4 of 9: availability (ADR-7), slot holds and bookings (critical flow 1), receipts and refunds.
-- Money state here (bookings paid, receipts, refunds) is written only by the Stripe webhook handler, as the service role
-- (ADR-6). The API roles get read access, plus the two small writes a patient and a professional make on a booking.

/* ---------------- availability ---------------- */

-- A weekly rule is stored as its first occurrence in UTC plus the zone it repeats in, at that wall-clock time
-- (data/sample/availability.json, lib/slots.ts StoredRule). Never local times.
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  time_zone text not null check (private.is_time_zone(time_zone)),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_rules_span check (ends_at > starts_at and ends_at <= starts_at + interval '24 hours')
);

create index availability_rules_professional_idx on public.availability_rules (professional_id, starts_at);

-- A dated change to the weekly hours: a day (or part of one) off, or extra hours.
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  kind public.availability_exception_kind not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_exceptions_span check (ends_at > starts_at)
);

create index availability_exceptions_professional_idx on public.availability_exceptions (professional_id, starts_at);

create trigger availability_rules_set_updated_at before update on public.availability_rules
  for each row execute function private.set_updated_at();
create trigger availability_exceptions_set_updated_at before update on public.availability_exceptions
  for each row execute function private.set_updated_at();

/* ---------------- slot_holds ---------------- */

-- Created with the PaymentIntent, business.slotHoldMinutes long (task 3.2). The unique constraint on (slot_start,
-- professional_id) is the double-hold guard and the rigor-review index; a second patient's insert for the same slot
-- fails (23505), and the exclusion constraint refuses a hold that overlaps another one with a different start (23P01).
-- The webhook consumes the hold when the payment succeeds (the consumed row keeps the booked slot taken); the minute
-- sweep deletes expired holds, and a cancelled booking's hold is deleted to free the slot.
create table public.slot_holds (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status public.slot_hold_status not null default 'held',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  payment_intent_id text unique check (payment_intent_id ~ '^pi_'),
  -- The answers asked before the hold (rule P8); the booking copies them.
  visit_type public.visit_type not null,
  booked_by public.booked_by not null default 'self',
  age_group public.age_group,
  concern text check (char_length(concern) <= 2000),
  -- The language the patient wrote the concern in (dir, and an offered translation).
  concern_locale public.app_locale,
  patient_country text check (patient_country ~ '^[A-Z]{2}$'),
  patient_phone text check (char_length(patient_phone) between 4 and 32),
  created_at timestamptz not null default now(),
  constraint slot_holds_one_hold_per_slot unique (slot_start, professional_id),
  -- A slot is one visit: the longest slot length (business.slotLengthMinutesOptions) is well under this ceiling.
  constraint slot_holds_slot_span check (slot_end > slot_start and slot_end <= slot_start + interval '4 hours'),
  constraint slot_holds_no_overlap exclude using gist (professional_id with =, tstzrange(slot_start, slot_end) with &&),
  constraint slot_holds_concern_locale check ((concern is null) = (concern_locale is null)),
  -- A hard ceiling only: the hold length itself is business.slotHoldMinutes, set by server code.
  constraint slot_holds_expiry_ceiling check (expires_at > created_at and expires_at <= created_at + interval '1 hour'),
  constraint slot_holds_consumed check ((status = 'consumed') = (consumed_at is not null))
);

create index slot_holds_professional_idx on public.slot_holds (professional_id, slot_start);
create index slot_holds_patient_idx on public.slot_holds (patient_id);
create index slot_holds_sweep_idx on public.slot_holds (expires_at) where status = 'held';
-- One live hold per patient: a patient checks out one slot at a time, so one account cannot hoard a doctor's calendar.
create unique index slot_holds_one_live_hold_per_patient on public.slot_holds (patient_id) where status = 'held';

/* ---------------- bookings ---------------- */

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete restrict,
  -- Unlinked when the patient deletes their account; the booking itself is kept for accountData.paymentRecordsKeepYears
  -- with the patient's name, phone and concern removed (private.profiles_scrub_bookings below).
  patient_id uuid references public.profiles (id) on delete set null,
  hold_id uuid unique references public.slot_holds (id) on delete set null,
  -- The webhook's idempotency key: one booking per payment.
  payment_intent_id text not null unique check (payment_intent_id ~ '^pi_'),
  status public.booking_status not null default 'upcoming',
  visit_type public.visit_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  patient_time_zone text not null check (private.is_time_zone(patient_time_zone)),
  professional_time_zone text not null check (private.is_time_zone(professional_time_zone)),
  -- What the professional sees about the patient: first names only, copied at booking time.
  patient_first_name_en text check (char_length(patient_first_name_en) between 1 and 100),
  patient_first_name_ar text check (char_length(patient_first_name_ar) between 1 and 100),
  booked_by public.booked_by not null default 'self',
  age_group public.age_group,
  concern text check (char_length(concern) <= 2000),
  -- The language the patient wrote the concern in (dir, and an offered translation).
  concern_locale public.app_locale,
  patient_country text check (patient_country ~ '^[A-Z]{2}$'),
  patient_phone text check (char_length(patient_phone) between 4 and 32),
  -- The patient's own checklist (screen 32 shows it to the doctor).
  prepared text[] not null default '{}'
    check (prepared <@ array['records', 'medicines', 'questions', 'deviceTest']::text[] and private.has_no_duplicates(prepared)),
  -- The professional's video link, copied at confirmation; phone visits have none.
  join_url text check (join_url ~ '^https://' and char_length(join_url) <= 500),
  -- The three lines as charged (rule P1), never recomputed from today's fee.
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  doctor_fee_cents integer not null check (doctor_fee_cents >= 0),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  card_processing_cents integer not null check (card_processing_cents >= 0),
  total_cents integer generated always as (doctor_fee_cents + platform_fee_cents + card_processing_cents) stored,
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by public.cancelled_by,
  done_at timestamptz,
  stripe_transfer_id text check (stripe_transfer_id ~ '^tr_'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_span check (ends_at > starts_at),
  constraint bookings_concern_locale check ((concern is null) = (concern_locale is null)),
  constraint bookings_cancellation check ((cancelled_at is null) = (cancelled_by is null)),
  constraint bookings_cancelled_have_time check (status not in ('cancelled', 'refunded') or cancelled_at is not null),
  -- 'done' is the professional's mark (screen 32), so a done visit always has the time it was marked.
  constraint bookings_done_have_time check (status <> 'done' or done_at is not null),
  -- No two live visits of one professional overlap, whatever their start times.
  constraint bookings_no_overlap exclude using gist (professional_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status in ('upcoming', 'done'))
);

-- Second line behind the hold constraint: one live booking per doctor per start time.
create unique index bookings_one_per_slot_idx on public.bookings (professional_id, starts_at)
  where status in ('upcoming', 'done');
create index bookings_patient_idx on public.bookings (patient_id, starts_at);

create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function private.set_updated_at();

-- The two API writes on a booking: the patient ticks their checklist, the professional marks a visit that has started
-- as done (the database stamps the time and moves the status) or takes the mark back.
create function private.bookings_guard_api_update() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_patient boolean := coalesce(new.patient_id = auth.uid(), false);
  is_professional boolean := coalesce(new.professional_id = private.my_professional_id(), false);
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if new.prepared is distinct from old.prepared and not is_patient then
    raise exception 'only the patient updates their checklist' using errcode = '42501';
  end if;
  if new.done_at is distinct from old.done_at then
    if not is_professional then
      raise exception 'only the professional marks a visit done' using errcode = '42501';
    end if;
    if new.done_at is not null then
      if old.status <> 'upcoming' or old.starts_at > now() then
        raise exception 'only a visit that has started and is not cancelled can be marked done' using errcode = '42501';
      end if;
      new.done_at := now();
      new.status := 'done';
    elsif old.status = 'done' then
      new.status := 'upcoming';
    end if;
  end if;
  return new;
end;
$$;

create trigger bookings_guard_api_update before update on public.bookings
  for each row execute function private.bookings_guard_api_update();

/* ---------------- receipts ---------------- */

-- The payment facts payment_intent.succeeded stores: a visit (screen 23; the lines are the booking's) or the processing of
-- a record set (task 3.7). A records receipt outlives its set (record_set_id goes null when the patient deletes the set),
-- so payments are kept for accountData.paymentRecordsKeepYears whatever the patient deletes.
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  subject text not null default 'booking' check (subject in ('booking', 'records')),
  booking_id uuid unique references public.bookings (id) on delete restrict,
  patient_id uuid references public.profiles (id) on delete set null,
  receipt_number text not null unique check (char_length(receipt_number) between 1 and 40),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_cents integer not null check (amount_cents > 0),
  paid_at timestamptz not null,
  card_brand text check (char_length(card_brand) <= 20),
  card_last4 text check (card_last4 ~ '^[0-9]{4}$'),
  wallet public.payment_wallet,
  stripe_payment_intent_id text not null unique check (stripe_payment_intent_id ~ '^pi_'),
  stripe_charge_id text unique check (stripe_charge_id ~ '^(ch|py)_'),
  created_at timestamptz not null default now(),
  constraint receipts_subject check ((subject = 'booking') = (booking_id is not null))
);

create index receipts_patient_idx on public.receipts (patient_id, paid_at);

/* ---------------- refunds ---------------- */

-- One row per refund (screen 43). "pending" is a refund Stripe accepted whose charge.refunded webhook has not been
-- handled yet; the webhook moves it to "succeeded". idempotency_key is the one key per payment's refund request.
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  subject text not null default 'booking' check (subject in ('booking', 'records')),
  booking_id uuid references public.bookings (id) on delete restrict,
  receipt_id uuid references public.receipts (id) on delete restrict,
  patient_id uuid references public.profiles (id) on delete set null,
  stripe_refund_id text unique check (stripe_refund_id ~ '^(re|pyr)_'),
  status public.refund_status not null default 'pending',
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  reason public.refund_reason not null,
  initiated_by public.refund_initiator not null,
  requested_by uuid references public.profiles (id) on delete set null,
  note_en text check (char_length(note_en) <= 1000),
  note_ar text check (char_length(note_ar) <= 1000),
  idempotency_key text not null unique check (char_length(idempotency_key) between 1 and 200),
  requested_at timestamptz not null default now(),
  succeeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refunds_succeeded_have_time check (status <> 'succeeded' or succeeded_at is not null),
  constraint refunds_subject check ((subject = 'booking') = (booking_id is not null))
);

create index refunds_booking_idx on public.refunds (booking_id);
create index refunds_patient_idx on public.refunds (patient_id);

create trigger refunds_set_updated_at before update on public.refunds
  for each row execute function private.set_updated_at();

/* ---------------- account deletion ---------------- */

-- Deleting a patient's account (the deletion job after accountData.deletionGraceDays, or an admin) keeps their bookings
-- for the payment records but removes what identifies them: name, phone and concern (screen 28 promises the name and
-- phone go). Visits still ahead must be cancelled and refunded through Stripe first, so the delete is refused until then.
create function private.profiles_scrub_bookings() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.bookings where patient_id = old.id and status = 'upcoming' and starts_at > now()
  ) then
    raise exception 'cancel and refund the upcoming visits before deleting the account' using errcode = '55000';
  end if;
  update public.bookings
     set patient_first_name_en = null, patient_first_name_ar = null, patient_phone = null,
         concern = null, concern_locale = null
   where patient_id = old.id;
  return old;
end;
$$;

create trigger profiles_scrub_bookings before delete on public.profiles
  for each row execute function private.profiles_scrub_bookings();

/* ---------------- policy helpers ---------------- */

-- A patient keeps seeing the doctor of their own booking even after the listing is suspended or removed.
create function private.booked_professional_ids() returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct professional_id from public.bookings where patient_id = auth.uid();
$$;

/* ---------------- privileges and policies ---------------- */

alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.slot_holds enable row level security;
alter table public.bookings enable row level security;
alter table public.receipts enable row level security;
alter table public.refunds enable row level security;

revoke all on table public.availability_rules, public.availability_exceptions, public.slot_holds, public.bookings,
  public.receipts, public.refunds from anon, authenticated;

grant select on table public.availability_rules, public.availability_exceptions to anon, authenticated;
grant insert (professional_id, time_zone, starts_at, ends_at), update (time_zone, starts_at, ends_at), delete
  on table public.availability_rules to authenticated;
grant insert (professional_id, kind, starts_at, ends_at), update (kind, starts_at, ends_at), delete
  on table public.availability_exceptions to authenticated;
grant select, delete on table public.slot_holds to authenticated;
grant insert (
  professional_id, patient_id, slot_start, slot_end, expires_at, visit_type, booked_by, age_group, concern,
  concern_locale, patient_country, patient_phone
) on table public.slot_holds to authenticated;
grant select on table public.bookings, public.receipts, public.refunds to authenticated;
grant update (prepared, done_at) on table public.bookings to authenticated;

create policy professionals_select_booked on public.professionals for select to authenticated
  using (id in (select private.booked_professional_ids()));

create policy availability_rules_select on public.availability_rules for select to anon, authenticated
  using (
    private.professional_is_verified(professional_id)
    or professional_id = (select private.my_professional_id())
    or (select private.is_admin())
  );
create policy availability_rules_insert_own on public.availability_rules for insert to authenticated
  with check (professional_id = (select private.my_professional_id()));
create policy availability_rules_update_own on public.availability_rules for update to authenticated
  using (professional_id = (select private.my_professional_id()))
  with check (professional_id = (select private.my_professional_id()));
create policy availability_rules_delete_own on public.availability_rules for delete to authenticated
  using (professional_id = (select private.my_professional_id()));

create policy availability_exceptions_select on public.availability_exceptions for select to anon, authenticated
  using (
    private.professional_is_verified(professional_id)
    or professional_id = (select private.my_professional_id())
    or (select private.is_admin())
  );
create policy availability_exceptions_insert_own on public.availability_exceptions for insert to authenticated
  with check (professional_id = (select private.my_professional_id()));
create policy availability_exceptions_update_own on public.availability_exceptions for update to authenticated
  using (professional_id = (select private.my_professional_id()))
  with check (professional_id = (select private.my_professional_id()));
create policy availability_exceptions_delete_own on public.availability_exceptions for delete to authenticated
  using (professional_id = (select private.my_professional_id()));

create policy slot_holds_select_own on public.slot_holds for select to authenticated
  using (patient_id = (select auth.uid()) or (select private.is_admin()));
create policy slot_holds_insert_own on public.slot_holds for insert to authenticated
  with check (
    patient_id = (select auth.uid())
    and slot_start > now()
    and private.professional_is_bookable(professional_id)
  );
-- Letting go of a hold before it expires (back from checkout).
create policy slot_holds_delete_own on public.slot_holds for delete to authenticated
  using (patient_id = (select auth.uid()) and status = 'held');

create policy bookings_select on public.bookings for select to authenticated
  using (
    patient_id = (select auth.uid())
    or professional_id = (select private.my_professional_id())
    or (select private.is_admin())
  );
create policy bookings_update_patient on public.bookings for update to authenticated
  using (patient_id = (select auth.uid()))
  with check (patient_id = (select auth.uid()));
create policy bookings_update_professional on public.bookings for update to authenticated
  using (professional_id = (select private.my_professional_id()))
  with check (professional_id = (select private.my_professional_id()));

create policy receipts_select on public.receipts for select to authenticated
  using (patient_id = (select auth.uid()) or (select private.is_admin()));

create policy refunds_select on public.refunds for select to authenticated
  using (patient_id = (select auth.uid()) or (select private.is_admin()));
