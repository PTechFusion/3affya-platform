-- L1 schema v1, file 8 of 9: the append-only audit log (ADR-2, lib/audit.ts, screen 47).
--
-- Insert-only for every role: no UPDATE, DELETE or TRUNCATE privilege for anon, authenticated or the service role, and
-- triggers that refuse all three even for the table owner. Admins read it (with TOTP); server code and webhook handlers
-- append to it; a signed-in patient or professional may append only the events of their own vocabulary below, naming
-- themselves as the actor. Every entry is size-capped, because a row can never be removed. No foreign keys: an entry
-- outlives the account and the rows it names, and a cascading delete must never rewrite history.

create table public.audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid,
  actor_kind public.audit_actor_kind not null,
  -- Which system wrote a system entry (e.g. stripe, pipeline, scheduler, registry). Server code only.
  actor_system text check (actor_system ~ '^[a-z][a-z0-9]*(_[a-z0-9]+)*$' and char_length(actor_system) <= 40),
  -- The vocabulary in lib/audit.ts, e.g. "verification.approved".
  action text not null check (action ~ '^[a-z][a-zA-Z]*(\.[a-z][a-zA-Z]*)+$' and char_length(action) <= 64),
  -- lib/audit.ts AUDIT_TARGETS, e.g. "professional", "booking".
  target_type text not null check (target_type ~ '^[a-z][a-zA-Z]*$' and char_length(target_type) <= 40),
  target_id text not null check (char_length(target_id) between 1 and 100),
  -- The professional the target belongs to, for the per-listing filter.
  target_professional_id uuid,
  -- AuditChange[]: { field, kind, old, new, currency?, lang? }.
  changes jsonb not null default '[]'::jsonb check (jsonb_typeof(changes) = 'array' and octet_length(changes::text) <= 32768),
  -- AuditDetail[]: facts about the event that are not changes.
  details jsonb not null default '[]'::jsonb check (jsonb_typeof(details) = 'array' and octet_length(details::text) <= 32768),
  -- Verification events: { reviewer, checks: [{ kind, source, result, checkedAt, by }] } (rule A1).
  verification jsonb
    check (verification is null or (jsonb_typeof(verification) = 'object' and octet_length(verification::text) <= 16384)),
  -- { en, ar } for rejections and removals.
  note jsonb check (note is null or (jsonb_typeof(note) = 'object' and octet_length(note::text) <= 8192)),
  request_id text check (char_length(request_id) <= 100),
  stripe_event_id text check (stripe_event_id ~ '^evt_'),
  constraint audit_log_actor check (actor_kind = 'system' or actor_id is not null),
  constraint audit_log_actor_system check (actor_system is null or actor_kind = 'system'),
  -- A system entry always says which system wrote it, so screen 47 can name the actor.
  constraint audit_log_system_named check (actor_kind <> 'system' or actor_system is not null)
);

create index audit_log_created_at_idx on public.audit_log (created_at);
create index audit_log_target_idx on public.audit_log (target_type, target_id);
create index audit_log_target_professional_idx on public.audit_log (target_professional_id)
  where target_professional_id is not null;
create index audit_log_actor_idx on public.audit_log (actor_id) where actor_id is not null;

create function private.audit_log_refuse_change() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only: % is refused', tg_op using errcode = '42501';
end;
$$;

create trigger audit_log_refuse_update_delete before update or delete on public.audit_log
  for each row execute function private.audit_log_refuse_change();
create trigger audit_log_refuse_truncate before truncate on public.audit_log
  for each statement execute function private.audit_log_refuse_change();

alter table public.audit_log enable row level security;

revoke all on table public.audit_log from public, anon, authenticated, service_role;
grant select, insert on table public.audit_log to service_role;
grant select on table public.audit_log to authenticated;
grant insert (
  actor_id, actor_kind, action, target_type, target_id, target_professional_id, changes, details, verification, note,
  request_id
) on table public.audit_log to authenticated;

-- The professionals a patient's own entries may name: those of the patient's bookings and shares.
create function private.my_related_professional_ids() returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select professional_id from public.bookings where patient_id = auth.uid()
  union
  select professional_id from public.record_shares where patient_id = auth.uid();
$$;

create policy audit_log_select_admin on public.audit_log for select to authenticated
  using ((select private.is_admin()));
-- A signed-in user appends entries about their own actions, as their own role. A patient and a professional each have
-- their own events of lib/audit.ts (an admin event such as verification.approved is refused) and may name only a listing
-- they are part of; an admin entry needs the TOTP session.
create policy audit_log_insert_self on public.audit_log for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and actor_kind::text = (select private.my_role())::text
    and (
      (
        actor_kind = 'patient'
        and action in ('booking.cancelled', 'recordSet.uploaded', 'share.created')
        and (target_professional_id is null or target_professional_id in (select private.my_related_professional_ids()))
      )
      or (
        actor_kind = 'professional'
        and action in ('claim.submitted', 'invite.used', 'listing.edited', 'share.opened', 'summary.reviewed')
        and (target_professional_id is null or target_professional_id = (select private.my_professional_id()))
      )
      or (actor_kind = 'admin' and (select private.is_admin()))
    )
  );
