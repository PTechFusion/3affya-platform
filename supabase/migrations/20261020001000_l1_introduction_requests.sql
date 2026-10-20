-- L1 schema v1, file 10 of 10: introduction requests (screen 32, tasks 2.9, 3.3 and 3.12; added 20 Oct 2026).
--
-- A request is what a patient sends a verified professional before any payment: the time they asked for, the visit type,
-- who it is for and the concern, typed in the booking form or pre-filled by the light intake chat (task 3.12), whose
-- transcript is stored with it and is the patient's to delete. The professional's inbox lists open requests beside the
-- paid bookings. A request ends one way: the patient withdraws it, the professional declines it, or it becomes a paid
-- booking (booking_id, written by the Stripe webhook as the service role). Like a booking, it stays as a line when the
-- patient deletes their account, without their name, phone or transcript.

create type public.introduction_request_status as enum ('open', 'booked', 'declined', 'withdrawn');

create table public.introduction_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.profiles (id) on delete set null,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  -- The group the intake chat suggested, when the request came from it.
  specialty_id uuid references public.specialties (id) on delete set null,
  status public.introduction_request_status not null default 'open',
  -- The time the patient asked for; the professional answers with a slot when they confirm.
  requested_start timestamptz not null,
  visit_type public.visit_type not null,
  booked_by public.booked_by not null default 'self',
  age_group public.age_group,
  concern text check (char_length(concern) <= 2000),
  concern_locale public.app_locale,
  prepared text[] not null default '{}'
    check (prepared <@ array['records', 'medicines', 'questions', 'deviceTest']::text[] and private.has_no_duplicates(prepared)),
  -- What the professional sees about the patient, copied from the profile on insert (trigger below; never the client's).
  patient_first_name_en text check (char_length(patient_first_name_en) between 1 and 100),
  patient_first_name_ar text check (char_length(patient_first_name_ar) between 1 and 100),
  patient_gender public.gender,
  patient_time_zone text not null check (private.is_time_zone(patient_time_zone)),
  -- The intake chat (task 3.12): [{ role, text, at }] turns, at most business.intakeMaxTurns; the patient can delete it.
  transcript jsonb
    check (transcript is null or (jsonb_typeof(transcript) = 'array' and octet_length(transcript::text) <= 65536)),
  -- The intake consent shown before the first question (task 3.12).
  consent_id uuid references public.consents (id) on delete set null,
  booking_id uuid unique references public.bookings (id) on delete set null,
  received_at timestamptz not null default now(),
  answered_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint introduction_requests_concern_locale check ((concern is null) = (concern_locale is null)),
  constraint introduction_requests_withdrawn check ((status = 'withdrawn') = (withdrawn_at is not null)),
  constraint introduction_requests_answered check (status not in ('declined', 'booked') or answered_at is not null)
);

create index introduction_requests_inbox_idx on public.introduction_requests (professional_id, status, received_at);
create index introduction_requests_patient_idx on public.introduction_requests (patient_id, received_at);

create trigger introduction_requests_set_updated_at before update on public.introduction_requests
  for each row execute function private.set_updated_at();

-- The patient's first names and gender come from their profile, whatever the client sent (as for shares).
create function private.introduction_requests_copy_patient() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.first_name_en, p.first_name_ar, p.gender
    into new.patient_first_name_en, new.patient_first_name_ar, new.patient_gender
    from public.profiles p
   where p.id = new.patient_id;
  return new;
end;
$$;

create trigger introduction_requests_copy_patient before insert on public.introduction_requests
  for each row execute function private.introduction_requests_copy_patient();

-- The API writes on a request: the patient withdraws an open one, ticks their checklist or deletes the transcript; the
-- professional declines an open one. The database stamps the time of each move.
create function private.introduction_requests_guard_api_update() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_patient boolean := coalesce(old.patient_id = auth.uid(), false);
  is_professional boolean := coalesce(old.professional_id = private.my_professional_id(), false);
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if new.status is distinct from old.status then
    if old.status = 'open' and new.status = 'withdrawn' and is_patient then
      new.withdrawn_at := now();
    elsif old.status = 'open' and new.status = 'declined' and is_professional then
      new.answered_at := now();
    else
      raise exception 'a request moves from open to withdrawn (patient) or declined (professional) only' using errcode = '42501';
    end if;
  end if;
  if new.transcript is distinct from old.transcript and not (is_patient and new.transcript is null) then
    raise exception 'only the patient deletes the transcript' using errcode = '42501';
  end if;
  if new.prepared is distinct from old.prepared and not is_patient then
    raise exception 'only the patient updates their checklist' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger introduction_requests_guard_api_update before update on public.introduction_requests
  for each row execute function private.introduction_requests_guard_api_update();

-- Deleting the patient's account keeps the request as a line, without who it was or the chat (file 4 does the same for
-- bookings).
create function private.profiles_scrub_introduction_requests() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.introduction_requests
     set patient_first_name_en = null, patient_first_name_ar = null, patient_gender = null, transcript = null
   where patient_id = old.id;
  return old;
end;
$$;

create trigger profiles_scrub_introduction_requests before delete on public.profiles
  for each row execute function private.profiles_scrub_introduction_requests();

-- The intake consent a request names must be the patient's own, of kind intakeChat, and not withdrawn.
create function private.is_own_intake_consent(consent uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.consents
     where id = consent and user_id = auth.uid() and kind = 'intakeChat' and withdrawn_at is null
  );
$$;

alter table public.introduction_requests enable row level security;

revoke all on table public.introduction_requests from anon, authenticated;
grant select on table public.introduction_requests to authenticated;
grant insert (
  patient_id, professional_id, specialty_id, requested_start, visit_type, booked_by, age_group, concern, concern_locale,
  prepared, patient_time_zone, transcript, consent_id
) on table public.introduction_requests to authenticated;
grant update (status, transcript, prepared) on table public.introduction_requests to authenticated;

create policy introduction_requests_select on public.introduction_requests for select to authenticated
  using (
    patient_id = (select auth.uid())
    or professional_id = (select private.my_professional_id())
    or (select private.is_admin())
  );
create policy introduction_requests_insert_own on public.introduction_requests for insert to authenticated
  with check (
    patient_id = (select auth.uid())
    and private.professional_is_verified(professional_id)
    and requested_start > now()
    and (consent_id is null or private.is_own_intake_consent(consent_id))
  );
create policy introduction_requests_update_patient on public.introduction_requests for update to authenticated
  using (patient_id = (select auth.uid()))
  with check (patient_id = (select auth.uid()));
create policy introduction_requests_update_professional on public.introduction_requests for update to authenticated
  using (professional_id = (select private.my_professional_id()))
  with check (professional_id = (select private.my_professional_id()));
