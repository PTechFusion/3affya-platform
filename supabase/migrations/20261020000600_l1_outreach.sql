-- L1 schema v1, file 6 of 9: claim invites (critical flow 3, task 2.3, screen 46) and removal requests (screen 41).
-- Both are admin-only through the API. The claim page and the remove-me form run in server code, which looks rows up by
-- token hash and writes them; anonymous callers never touch these tables directly.

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  email text not null check (email ~ '^[^@[:space:]]+@[^@[:space:]]+$' and char_length(email) <= 254),
  language public.app_locale not null default 'en',
  -- SHA-256 (hex) of the one-time token in the link. The token itself is never stored.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  personal_line text check (char_length(personal_line) <= 1000),
  created_by uuid references public.profiles (id) on delete set null,
  sent_at timestamptz not null default now(),
  -- outreach.inviteValidDays after sending, set by server code.
  expires_at timestamptz not null,
  -- The claim page was opened from the link (email opens are not tracked).
  opened_at timestamptz,
  used_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null,
  -- As the Resend delivery webhook reports it.
  bounced_at timestamptz,
  bounce public.invite_bounce,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invites_expiry check (expires_at > sent_at),
  constraint invites_bounce check ((bounced_at is null) = (bounce is null))
);

create index invites_professional_idx on public.invites (professional_id, sent_at);

-- The status the outreach list shows (screen 46), first match wins: revoked, claimed, bounced, expired, opened, sent.
-- Derived, never stored, so it cannot go stale when an invite expires. PostgREST reads it as a computed column:
-- select=id,current_status.
create function public.current_status(invite public.invites) returns public.invite_status
language sql
stable
set search_path = ''
as $$
  select (case
    when invite.revoked_at is not null then 'revoked'
    when invite.used_at is not null then 'claimed'
    when invite.bounced_at is not null then 'bounced'
    when invite.expires_at <= now() then 'expired'
    when invite.opened_at is not null then 'opened'
    else 'sent'
  end)::public.invite_status;
$$;

-- What screen 10's remove branch stores: the four fields the doctor typed, the page language, and the admin's handling.
create table public.removal_requests (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete restrict,
  requester_name text not null check (char_length(requester_name) between 1 and 100),
  requester_email text not null check (requester_email ~ '^[^@[:space:]]+@[^@[:space:]]+$' and char_length(requester_email) <= 254),
  npi text not null check (npi ~ '^[0-9]{10}$'),
  reason public.removal_reason not null,
  details text not null default '' check (char_length(details) <= 1000),
  locale public.app_locale not null,
  status public.removal_status not null default 'open',
  -- The business.removalSlaHours promise counts from here.
  received_at timestamptz not null default now(),
  -- SHA-256 (hex) of the token in the confirmation link, and when the doctor opened it.
  confirm_token_hash text unique check (confirm_token_hash ~ '^[0-9a-f]{64}$'),
  email_confirmed_at timestamptz,
  info_requested_at timestamptz,
  info_requested_by uuid references public.profiles (id) on delete set null,
  info_question text check (char_length(info_question) <= 2000),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  decision_reason text check (char_length(decision_reason) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint removal_requests_decided check (status not in ('confirmed', 'refused') or decided_at is not null),
  constraint removal_requests_info check (status <> 'infoRequested' or info_requested_at is not null)
);

create index removal_requests_queue_idx on public.removal_requests (status, received_at);
create index removal_requests_professional_idx on public.removal_requests (professional_id);

create trigger removal_requests_set_updated_at before update on public.removal_requests
  for each row execute function private.set_updated_at();

alter table public.invites enable row level security;
alter table public.removal_requests enable row level security;

revoke all on table public.invites, public.removal_requests from anon, authenticated;
grant select on table public.invites, public.removal_requests to authenticated;
revoke all on function public.current_status(public.invites) from public, anon;
grant execute on function public.current_status(public.invites) to authenticated, service_role;

create policy invites_select_admin on public.invites for select to authenticated
  using ((select private.is_admin()));
create policy removal_requests_select_admin on public.removal_requests for select to authenticated
  using ((select private.is_admin()));
