-- L1 schema v1, file 3 of 9: the directory. Specialties (104 groups, task 1.5), professionals (66k registry rows plus the
-- claimed ones, ADR-5), the private side of a professional, specialty links, expertise tags and credential files.

-- NUCC taxonomy codes are ten characters: three digits, six letters or digits, then X (e.g. 207RC0000X, 1223G0001X).
create function private.is_taxonomy_code(value text) returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is null or value ~ '^[0-9]{3}[0-9A-Z]{6}X$';
$$;

create function private.are_taxonomy_codes(codes text[]) returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(private.is_taxonomy_code(c) and c is not null), true) from unnest(codes) as c;
$$;

-- ISO 639-1 language codes ("ar", "en").
create function private.are_language_codes(codes text[]) returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(c is not null and c ~ '^[a-z]{2}$'), true) from unnest(codes) as c;
$$;

-- USPS codes of the 50 states, DC, the inhabited territories and the minor outlying islands (the same list
-- scripts/seed_professionals.py imports). Military mail codes (AA, AE, AP) and foreign regions are not a practice state.
create function private.is_us_state_code(value text) returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is null or value = any (array[
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
    'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA',
    'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'AS', 'GU', 'MP', 'PR', 'VI', 'UM'
  ]);
$$;

-- No entry twice (visit types, languages, checklist items).
create function private.has_no_duplicates(items anyarray) returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(items) = (select count(distinct i) from unnest(items) as i);
$$;

-- A short list of short texts (training lines, hospital names): at most max_items entries of 1 to max_length characters,
-- none of them null (bool_and skips nulls, so the test is explicit).
create function private.are_short_texts(items text[], max_items integer, max_length integer) returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(items) <= max_items
     and coalesce((select bool_and(i is not null and char_length(i) between 1 and max_length) from unnest(items) as i), true);
$$;

/* ---------------- specialties ---------------- */

create table public.specialties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en text not null check (char_length(name_en) between 1 and 120),
  name_ar text not null check (char_length(name_ar) between 1 and 120),
  -- The directory groups specialties by body system (screen 4). The key; the names are copy (messages).
  body_system text check (body_system ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position smallint not null default 0,
  -- Admin can hide a group from patients (screen 40) without deleting it.
  shown boolean not null default true,
  -- NPPES (NUCC) codes mapped to this group by scripts/map_taxonomy.py. A code maps to one group only (trigger below).
  taxonomy_codes text[] not null default '{}' check (private.are_taxonomy_codes(taxonomy_codes)),
  -- Search words patients type, Arabic script and Latin script kept apart (rule S2).
  synonyms_ar text[] not null default '{}' check (private.are_short_texts(synonyms_ar, 50, 60)),
  synonyms_en text[] not null default '{}' check (private.are_short_texts(synonyms_en, 50, 60)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index specialties_taxonomy_codes_idx on public.specialties using gin (taxonomy_codes);

create function private.specialties_codes_map_once() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  other_slug text;
begin
  -- One writer of taxonomy codes at a time, so concurrent edits cannot each give the same code to a different group.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.specialties.taxonomy_codes'));
  select s.slug into other_slug
    from public.specialties s
   where s.id <> new.id and s.taxonomy_codes && new.taxonomy_codes
   limit 1;
  if found then
    raise exception 'a taxonomy code of "%" is already mapped to "%"', new.slug, other_slug using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger specialties_codes_map_once before insert or update of taxonomy_codes on public.specialties
  for each row execute function private.specialties_codes_map_once();
create trigger specialties_set_updated_at before update on public.specialties
  for each row execute function private.set_updated_at();

/* ---------------- professionals ---------------- */

-- Public by design for verified and unclaimed rows (ADR-5): every column here may be read by anyone when the row is public.
-- Anything that must stay with the professional and admin (video link, licence number, Stripe account) is in
-- professional_private below.
create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  -- The account that claimed the row (critical flow 3). Null while unclaimed.
  user_id uuid unique references public.profiles (id) on delete set null,
  npi text not null unique check (npi ~ '^[12][0-9]{9}$'),
  -- firstname-lastname-city-npiSuffix, set once on insert (trigger) and never rewritten, so URLs stay stable.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status public.professional_status not null default 'unclaimed',
  source public.professional_source not null default 'nppes',
  -- Registry names in Latin script; the slug is built from them.
  first_name text not null check (char_length(first_name) between 1 and 100),
  middle_name text check (char_length(middle_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  -- Display names as the card shows them ("Dr Sara Haddad"). Registry rows have no Arabic name until claimed.
  name_en text not null check (char_length(name_en) between 1 and 200),
  name_ar text check (char_length(name_ar) between 1 and 200),
  gender public.gender,
  registry_credential text check (char_length(registry_credential) <= 100),
  registry_profession text check (char_length(registry_profession) <= 100),
  taxonomy_code text check (private.is_taxonomy_code(taxonomy_code)),
  -- Primary specialty group; null when the taxonomy code is unmapped (scripts/map_taxonomy.py never defaults one).
  specialty_id uuid references public.specialties (id) on delete set null,
  city_en text check (char_length(city_en) between 1 and 100),
  city_ar text check (char_length(city_ar) between 1 and 100),
  state_code text check (private.is_us_state_code(state_code)),
  -- 'US' when the registry gives a US practice state; null for the few registry rows that practise abroad.
  practice_country text check (practice_country ~ '^[A-Z]{2}$'),
  photo_url text check (char_length(photo_url) <= 500),
  bio_en text check (char_length(bio_en) <= 4000),
  bio_ar text check (char_length(bio_ar) <= 4000),
  training text[] not null default '{}' check (private.are_short_texts(training, 20, 300)),
  languages text[] not null default '{}'
    check (private.are_language_codes(languages) and private.has_no_duplicates(languages)),
  arabic_dialect text check (arabic_dialect ~ '^[A-Za-z]{2,30}$'),
  visit_types public.visit_type[] not null default '{}'
    check (array_position(visit_types, null) is null and private.has_no_duplicates(visit_types)),
  age_scope public.age_scope,
  years_in_practice smallint check (years_in_practice between 0 and 80),
  medical_school text check (char_length(medical_school) <= 200),
  graduation_year smallint check (graduation_year between 1900 and 2100),
  group_practice text check (char_length(group_practice) <= 200),
  hospital_affiliations text[] not null default '{}' check (private.are_short_texts(hospital_affiliations, 50, 200)),
  -- The public badge, set by admin review (rule A1). board_name and board_status are what the doctor entered.
  board_certified boolean not null default false,
  board_status public.board_status,
  board_name text check (char_length(board_name) <= 200),
  licence_state text check (private.is_us_state_code(licence_state)),
  -- First-visit fee the doctor sets, in minor units (task 2.5; doctors charge in USD).
  fee_cents integer check (fee_cents > 0),
  fee_currency text not null default 'USD' check (fee_currency ~ '^[A-Z]{3}$'),
  -- Availability settings (screen 30, ADR-7). Null slot length or lead time means the config/business.ts default.
  time_zone text check (private.is_time_zone(time_zone)),
  slot_minutes smallint check (slot_minutes between 5 and 240),
  lead_time_hours smallint check (lead_time_hours between 0 and 720),
  accepting_new_patients boolean not null default false,
  -- Stripe has card payments and payouts both on (task 3.1); kept in step with professional_private by trigger.
  can_take_bookings boolean not null default false,
  -- Where the public facts of a registry row came from, and the file date ("listed from public registry").
  registry_source text check (registry_source in ('nppes', 'cms')),
  registry_as_of date,
  -- The CMS Doctors and Clinicians release that filled medical school, graduation year, gender, group practice and hospital
  -- affiliations (scripts/enrich_cms.py). Kept apart so an NPPES re-import and the CMS enrichment never overwrite each
  -- other's provenance.
  cms_as_of date,
  claimed_at timestamptz,
  review_submitted_at timestamptz,
  review_decided_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  verified_on date,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A claimed row always has its account; registry rows and removed rows may not.
  constraint professionals_claimed_have_account check (status in ('unclaimed', 'removed') or user_id is not null),
  constraint professionals_verified_have_date check (status <> 'verified' or verified_on is not null),
  -- An account is linked in the same statement that claims the row, so a registry row is never edited by an account
  -- while it still shows as unclaimed (and the registry snapshot stays the registry's).
  constraint professionals_unclaimed_no_account check (status <> 'unclaimed' or user_id is null)
);

-- The rigor-review index professionals(status, specialty, language, location). Multicolumn GIN (btree_gin) because
-- languages is an array and the directory filters on any subset of the four.
create index professionals_directory_idx on public.professionals
  using gin (status, specialty_id, languages, state_code, city_en);
-- Ordered pages for search results, admin listings and the sitemap batches.
create index professionals_status_specialty_name_idx on public.professionals (status, specialty_id, last_name, id);

-- plan_cache_mode: the slug check is re-planned on every row, so a bulk import that starts on a near-empty table switches
-- to the slug index as it grows instead of keeping a cached sequential scan (which made the first 66k import quadratic).
create function private.professionals_set_slug() returns trigger
language plpgsql
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  base text;
begin
  if new.slug is null or new.slug = '' then
    -- One slug writer at a time (a single key, so a 66k-row import holds one lock, not one per row): two concurrent
    -- inserts with the same name, city and last four digits then fall back to the full NPI instead of failing.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.professionals.slug'));
    base := concat_ws('-',
      nullif(private.slugify(new.first_name), ''),
      nullif(private.slugify(new.last_name), ''),
      nullif(private.slugify(new.city_en), ''));
    -- Names and city in another script slug to nothing: such a listing is "listing-1234".
    base := coalesce(nullif(base, ''), 'listing');
    new.slug := concat_ws('-', base, right(new.npi, 4));
    -- Same name, city and last four digits: the whole NPI keeps the slug unique.
    if exists (select 1 from public.professionals p where p.slug = new.slug) then
      new.slug := concat_ws('-', base, new.npi);
    end if;
  end if;
  return new;
end;
$$;

create trigger professionals_set_slug before insert on public.professionals
  for each row execute function private.professionals_set_slug();

-- state_code accepts only US codes, so a practice state means a US practice; the builder edits state_code only.
create function private.professionals_sync_practice_country() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.state_code is not null then
    new.practice_country := 'US';
  end if;
  return new;
end;
$$;

create trigger professionals_sync_practice_country before insert or update of state_code, practice_country
  on public.professionals
  for each row execute function private.professionals_sync_practice_country();
create trigger professionals_set_updated_at before update on public.professionals
  for each row execute function private.set_updated_at();

-- What a professional may change on their own row through the API. Column grants decide which columns; this decides the
-- values: the only status move is submitting a claim for review, and a verified listing's board and licence details
-- change through a new review, not in place. Admin decisions run as the service role from server code.
create function private.professionals_guard_owner_update() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if new.status is distinct from old.status then
    if old.status in ('claimed', 'rejected') and new.status = 'pending_review' then
      new.review_submitted_at := now();
    else
      raise exception 'a listing cannot move from % to % without an admin', old.status, new.status using errcode = '42501';
    end if;
  end if;
  if old.status in ('verified', 'suspended')
     and (new.board_name, new.board_status, new.licence_state) is distinct from (old.board_name, old.board_status, old.licence_state) then
    raise exception 'board and licence details of a verified listing change through a new review' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger professionals_guard_owner_update before update on public.professionals
  for each row execute function private.professionals_guard_owner_update();

/* ---------------- professional_private ---------------- */

-- One row per professional, created with it. Only the professional and admin read it.
create table public.professional_private (
  professional_id uuid primary key references public.professionals (id) on delete cascade,
  -- The doctor's own Zoom or Teams link (ADR-7); patients get it on their booking, never from the profile.
  video_link text check (video_link ~ '^https://' and char_length(video_link) <= 500),
  licence_number text check (char_length(licence_number) between 1 and 40),
  -- Read at the primary source by the reviewer (rule A2).
  licence_expires_on date,
  -- What the account.updated webhook stores (task 3.1, lib/payouts.ts). Written by the webhook only.
  stripe_account_id text unique check (stripe_account_id ~ '^acct_'),
  stripe_details_submitted boolean not null default false,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  stripe_currently_due text[] not null default '{}' check (array_position(stripe_currently_due, null) is null),
  stripe_past_due text[] not null default '{}' check (array_position(stripe_past_due, null) is null),
  stripe_bank_last4 text check (stripe_bank_last4 ~ '^[0-9]{4}$'),
  stripe_updated_at timestamptz,
  -- Admin suspension (screen 39). While suspended the listing is hidden from every public surface.
  suspended_at timestamptz,
  suspended_by uuid references public.profiles (id) on delete set null,
  suspension_reason_en text check (char_length(suspension_reason_en) <= 1000),
  suspension_reason_ar text check (char_length(suspension_reason_ar) <= 1000),
  -- The registry facts as they stood when the listing was claimed, so the review (screen 38) can show what the doctor
  -- changed. Written by the trigger below; the registry scripts never touch a claimed row again.
  registry_as_filed jsonb check (registry_as_filed is null or jsonb_typeof(registry_as_filed) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger professional_private_set_updated_at before update on public.professional_private
  for each row execute function private.set_updated_at();

create function private.professionals_create_private() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.professional_private (professional_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger professionals_create_private after insert on public.professionals
  for each row execute function private.professionals_create_private();

create function private.professional_private_sync_bookable() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.professionals
     set can_take_bookings = new.stripe_charges_enabled and new.stripe_payouts_enabled
   where id = new.professional_id
     and can_take_bookings is distinct from (new.stripe_charges_enabled and new.stripe_payouts_enabled);
  return new;
end;
$$;

create trigger professional_private_sync_bookable
  after insert or update of stripe_charges_enabled, stripe_payouts_enabled on public.professional_private
  for each row execute function private.professional_private_sync_bookable();

-- Leaving unclaimed snapshots the registry facts once (the first claim wins; a later claim keeps the first snapshot).
create function private.professionals_snapshot_registry() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'unclaimed' and new.status <> 'unclaimed' then
    update public.professional_private
       set registry_as_filed = jsonb_build_object(
         'firstName', old.first_name, 'middleName', old.middle_name, 'lastName', old.last_name,
         'nameEn', old.name_en, 'cityEn', old.city_en, 'cityAr', old.city_ar, 'stateCode', old.state_code,
         'taxonomyCode', old.taxonomy_code, 'specialtyId', old.specialty_id, 'registryCredential', old.registry_credential,
         'medicalSchool', old.medical_school, 'graduationYear', old.graduation_year, 'groupPractice', old.group_practice,
         'hospitalAffiliations', to_jsonb(old.hospital_affiliations), 'gender', old.gender,
         'registrySource', old.registry_source, 'registryAsOf', old.registry_as_of, 'cmsAsOf', old.cms_as_of)
     where professional_id = new.id and registry_as_filed is null;
  end if;
  return new;
end;
$$;

create trigger professionals_snapshot_registry after update of status on public.professionals
  for each row execute function private.professionals_snapshot_registry();

-- Deleting the account behind a claimed listing (the deletion job, or an admin) takes the listing down rather than
-- leaving a live page with no owner; the profile row's delete then unlinks it. Decision for Dr Ayman: "removed" (410,
-- as below) or back to the public registry row ("unclaimed").
create function private.profiles_release_listing() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.professionals
     set status = 'removed', removed_at = coalesce(removed_at, now())
   where user_id = old.id and status not in ('unclaimed', 'removed');
  return old;
end;
$$;

create trigger profiles_release_listing before delete on public.profiles
  for each row execute function private.profiles_release_listing();

-- A verified licence number changes through a new review, like the board details on the public row.
create function private.professional_private_guard_owner_update() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and new.licence_number is distinct from old.licence_number
     and exists (select 1 from public.professionals p where p.id = new.professional_id and p.status in ('verified', 'suspended')) then
    raise exception 'the licence number of a verified listing changes through a new review' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger professional_private_guard_owner_update before update on public.professional_private
  for each row execute function private.professional_private_guard_owner_update();

/* ---------------- professional_specialties ---------------- */

create table public.professional_specialties (
  professional_id uuid not null references public.professionals (id) on delete cascade,
  specialty_id uuid not null references public.specialties (id) on delete cascade,
  taxonomy_code text check (private.is_taxonomy_code(taxonomy_code)),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (professional_id, specialty_id)
);

create index professional_specialties_specialty_idx on public.professional_specialties (specialty_id, professional_id);
create unique index professional_specialties_one_primary_idx on public.professional_specialties (professional_id)
  where is_primary;

/* ---------------- expertise_tags ---------------- */

-- Up to 10 per locale (positions 0 to 9), title max 30 characters, nugget max 500, text only (task 2.5).
create table public.expertise_tags (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  locale public.app_locale not null,
  title text not null check (char_length(title) between 1 and 30),
  nugget text check (char_length(nugget) <= 500),
  position smallint not null check (position between 0 and 9),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deferred so a reorder that swaps two positions in one statement commits.
  constraint expertise_tags_position_key unique (professional_id, locale, position) deferrable initially deferred
);

create trigger expertise_tags_set_updated_at before update on public.expertise_tags
  for each row execute function private.set_updated_at();

/* ---------------- credentials ---------------- */

-- Credential files the doctor uploads in the builder (task 2.4), stored in the private `credentials` bucket under
-- {professional_id}/. PDF and images only. The reviewer accepts or rejects each file (screen 38).
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  kind public.credential_kind not null,
  file_name text not null check (char_length(file_name) between 1 and 255),
  storage_path text not null unique check (char_length(storage_path) <= 500),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes bigint not null check (size_bytes > 0),
  review_status public.credential_review_status not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  rejection_reason_en text check (char_length(rejection_reason_en) <= 1000),
  rejection_reason_ar text check (char_length(rejection_reason_ar) <= 1000),
  uploaded_at timestamptz not null default now(),
  -- Exactly {professional_id}/{one file name}: letters, digits, '_' and '-', one extension. No '..', '.', '%', '/' or
  -- backslash can reach another folder (supabase-js resolves '..' and '%2e%2e' in an object URL before sending it).
  constraint credentials_path_in_own_folder
    check (storage_path ~ ('^' || professional_id::text || '/[A-Za-z0-9_-]+(\.[A-Za-z0-9]{1,10})?$'))
);

create index credentials_professional_idx on public.credentials (professional_id);

/* ---------------- policy helpers ---------------- */

-- The caller's professional row, if they have claimed one.
create function private.my_professional_id() returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.professionals where user_id = auth.uid();
$$;

-- Child rows of a public listing (tags, specialty links) are public too.
create function private.professional_is_public(professional uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.professionals where id = professional and status in ('verified', 'unclaimed'));
$$;

-- Availability shows only on verified listings (ADR-5: a registry page has no availability).
create function private.professional_is_verified(professional uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.professionals where id = professional and status = 'verified');
$$;

-- A patient can hold a slot only with a verified doctor who takes new patients and whose Stripe account is live.
create function private.professional_is_bookable(professional uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.professionals
     where id = professional and status = 'verified' and can_take_bookings and accepting_new_patients
  );
$$;

/* ---------------- privileges and policies ---------------- */

alter table public.specialties enable row level security;
alter table public.professionals enable row level security;
alter table public.professional_private enable row level security;
alter table public.professional_specialties enable row level security;
alter table public.expertise_tags enable row level security;
alter table public.credentials enable row level security;

revoke all on table public.specialties, public.professionals, public.professional_private,
  public.professional_specialties, public.expertise_tags, public.credentials from anon, authenticated;

grant select on table public.specialties, public.professionals, public.professional_specialties, public.expertise_tags
  to anon, authenticated;
grant select on table public.professional_private, public.credentials to authenticated;

-- The builder's fields (tasks 2.4 to 2.6). Status is granted for the one move the guard allows (submit for review).
grant update (
  name_en, name_ar, photo_url, bio_en, bio_ar, training, languages, arabic_dialect, visit_types, age_scope,
  years_in_practice, board_status, board_name, licence_state, fee_cents, city_en, city_ar, state_code,
  time_zone, slot_minutes, lead_time_hours, accepting_new_patients, status
) on table public.professionals to authenticated;
grant update (video_link, licence_number) on table public.professional_private to authenticated;
grant insert (professional_id, locale, title, nugget, position), update (title, nugget, position), delete
  on table public.expertise_tags to authenticated;
grant insert (professional_id, kind, file_name, storage_path, mime_type, size_bytes), delete
  on table public.credentials to authenticated;

create policy specialties_select_shown on public.specialties for select to anon, authenticated
  using (shown or (select private.is_admin()));

create policy professionals_select_public on public.professionals for select to anon, authenticated
  using (status in ('verified', 'unclaimed'));
create policy professionals_select_own on public.professionals for select to authenticated
  using (user_id = (select auth.uid()));
create policy professionals_select_admin on public.professionals for select to authenticated
  using ((select private.is_admin()));
create policy professionals_update_own on public.professionals for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy professional_private_select_own on public.professional_private for select to authenticated
  using (professional_id = (select private.my_professional_id()) or (select private.is_admin()));
create policy professional_private_update_own on public.professional_private for update to authenticated
  using (professional_id = (select private.my_professional_id()))
  with check (professional_id = (select private.my_professional_id()));

create policy professional_specialties_select on public.professional_specialties for select to anon, authenticated
  using (
    private.professional_is_public(professional_id)
    or professional_id = (select private.my_professional_id())
    or (select private.is_admin())
  );

create policy expertise_tags_select on public.expertise_tags for select to anon, authenticated
  using (
    private.professional_is_public(professional_id)
    or professional_id = (select private.my_professional_id())
    or (select private.is_admin())
  );
create policy expertise_tags_insert_own on public.expertise_tags for insert to authenticated
  with check (professional_id = (select private.my_professional_id()));
create policy expertise_tags_update_own on public.expertise_tags for update to authenticated
  using (professional_id = (select private.my_professional_id()))
  with check (professional_id = (select private.my_professional_id()));
create policy expertise_tags_delete_own on public.expertise_tags for delete to authenticated
  using (professional_id = (select private.my_professional_id()));

create policy credentials_select_own on public.credentials for select to authenticated
  using (professional_id = (select private.my_professional_id()) or (select private.is_admin()));
create policy credentials_insert_own on public.credentials for insert to authenticated
  with check (professional_id = (select private.my_professional_id()));
-- A file still waiting for review can be taken back; a decided one stays as the review's evidence.
create policy credentials_delete_own_pending on public.credentials for delete to authenticated
  using (professional_id = (select private.my_professional_id()) and review_status = 'pending');
