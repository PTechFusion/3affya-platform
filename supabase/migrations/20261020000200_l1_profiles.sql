-- L1 schema v1, file 2 of 9: profiles, the role mirror from auth.users, and the role helpers every policy uses.

-- Valid IANA zone name (the viewer's or the rule's zone). Null passes: the app falls back to business.defaultTimeZone.
create function private.is_time_zone(value text) returns boolean
language sql
stable
set search_path = ''
as $$
  select value is null or exists (select 1 from pg_catalog.pg_timezone_names where name = value);
$$;

-- One row per auth user. Patients, professionals and admins all have one; it holds the person's own settings
-- (screen 28) and the role. The role is never written by the API: it mirrors app_metadata.role (ADR-8).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'patient',
  email text check (char_length(email) <= 254),
  name_en text check (char_length(name_en) between 1 and 200),
  name_ar text check (char_length(name_ar) between 1 and 200),
  -- What a professional or an admin sees about a patient: first names only (bookings copy them at booking time).
  first_name_en text check (char_length(first_name_en) between 1 and 100),
  first_name_ar text check (char_length(first_name_ar) between 1 and 100),
  gender public.gender,
  phone text check (char_length(phone) between 4 and 32),
  country text check (country ~ '^[A-Z]{2}$'),
  locale public.app_locale not null default 'ar',
  time_zone text check (private.is_time_zone(time_zone)),
  hijri boolean not null default false,
  email_summary_ready boolean not null default true,
  email_share_opened boolean not null default true,
  email_news boolean not null default false,
  -- Screen 28: a deletion request waits accountData.deletionGraceDays, then a job deletes the account.
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- A deletion request through the API is stamped by the database (the grace period counts from it); clearing it is the
-- "keep my account" undo (rule B10).
create function private.profiles_guard_api_update() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and new.deletion_requested_at is distinct from old.deletion_requested_at
     and new.deletion_requested_at is not null then
    new.deletion_requested_at := now();
  end if;
  return new;
end;
$$;

create trigger profiles_guard_api_update before update on public.profiles
  for each row execute function private.profiles_guard_api_update();

-- Mirrors auth.users into profiles: the row on sign-up, then role and email on every change. A missing role is a patient
-- (email OTP sign-up sets none); a role that is not one of the three is refused, so a typo in server code fails loudly.
create function private.sync_profile_from_auth() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_role text := new.raw_app_meta_data ->> 'role';
  mirrored public.user_role;
begin
  if raw_role is null then
    mirrored := 'patient';
  elsif raw_role in ('patient', 'professional', 'admin') then
    mirrored := raw_role::public.user_role;
  else
    raise exception 'app_metadata.role "%" is not a 3affya role', raw_role using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    insert into public.profiles (id, role, email) values (new.id, mirrored, new.email);
  else
    update public.profiles
       set role = mirrored, email = new.email
     where id = new.id
       and (role is distinct from mirrored or email is distinct from new.email);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.sync_profile_from_auth();
create trigger on_auth_user_updated after update of raw_app_meta_data, email on auth.users
  for each row execute function private.sync_profile_from_auth();

-- The caller's role, read from profiles (current even before the caller's JWT is refreshed).
create function private.my_role() returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Admin access needs the admin role AND a session that passed the TOTP step (aal2). ADR-8 and screen 37: no TOTP, no access.
create function private.is_admin() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (
  name_en, name_ar, first_name_en, first_name_ar, gender, phone, country, locale, time_zone, hijri,
  email_summary_ready, email_share_opened, email_news, deletion_requested_at
) on table public.profiles to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
