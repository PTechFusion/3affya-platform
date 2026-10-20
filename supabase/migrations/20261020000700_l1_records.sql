-- L1 schema v1, file 7 of 9: patient records (critical flow 2, ADR-4): sets, files, pages, typed items, summaries,
-- shares, consents and the pipeline's jobs.
--
-- Every child row carries patient_id and points at its parent through a composite foreign key that includes it, so a
-- page, item or summary can never belong to a different patient than its set, and RLS reads one column. Deleting a set
-- cascades to its files, pages, items, summary and shares (task 3.10) and queues its stored files for removal
-- (private.storage_purges, file 9); its payment stays on its receipt and its AI cost on ai_jobs; audit_log keeps only the
-- event. The pipeline (Inngest, task 3.8) writes as the service role. Patients create draft sets and upload files; a
-- professional reads a set's rows only through a live share addressed to them, and its files only through signed URLs
-- that server code mints after checking the share.

/* ---------------- record_sets ---------------- */

create table public.record_sets (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  status public.record_set_status not null default 'draft',
  -- The step the set is on (queued, processing) or stopped at (failed); null once done.
  step public.pipeline_step,
  accepted_bytes bigint not null default 0 check (accepted_bytes >= 0),
  page_count integer not null default 0 check (page_count >= 0),
  -- ceil(accepted bytes / recordsBlockGb) x recordsBlockPriceCents, computed by server code (task 3.7).
  quote_cents integer check (quote_cents >= 0),
  quote_currency text check (quote_currency ~ '^[A-Z]{3}$'),
  payment_intent_id text unique check (payment_intent_id ~ '^pi_'),
  failure_reason public.pipeline_failure_reason,
  failure_file_id uuid,
  failure_file_page integer check (failure_file_page > 0),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint record_sets_id_patient_key unique (id, patient_id),
  constraint record_sets_quote check ((quote_cents is null) = (quote_currency is null)),
  constraint record_sets_failed_have_reason check (status <> 'failed' or failure_reason is not null)
);

create index record_sets_patient_idx on public.record_sets (patient_id, created_at);

/* ---------------- record_files ---------------- */

-- Stored at records/{patient_id}/{set_id}/ in the private `records` bucket (critical flow 2).
create table public.record_files (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null,
  patient_id uuid not null,
  -- File order in the set; pages are numbered across the set in this order.
  position smallint not null check (position >= 0),
  name text not null check (char_length(name) between 1 and 255),
  kind public.record_file_kind not null,
  mime_type text check (char_length(mime_type) <= 150),
  size_bytes bigint not null check (size_bytes > 0),
  storage_path text not null unique check (char_length(storage_path) <= 500),
  status public.record_file_status not null default 'checking',
  reject_reason public.record_reject_reason,
  page_count integer check (page_count > 0),
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_at timestamptz not null default now(),
  constraint record_files_set_fkey foreign key (set_id, patient_id)
    references public.record_sets (id, patient_id) on delete cascade,
  constraint record_files_key unique (id, set_id, patient_id),
  constraint record_files_position_key unique (set_id, position),
  -- Exactly {patient_id}/{set_id}/{one file name}: letters, digits, '_' and '-', one extension. No '..', '.', '%', '/' or
  -- backslash can reach another folder (supabase-js resolves '..' and '%2e%2e' in an object URL before sending it).
  constraint record_files_path_in_set_folder
    check (storage_path ~ ('^' || patient_id::text || '/' || set_id::text || '/[A-Za-z0-9_-]+(\.[A-Za-z0-9]{1,10})?$')),
  constraint record_files_rejected_have_reason check ((status = 'rejected') = (reject_reason is not null))
);

create index record_files_patient_idx on public.record_files (patient_id);

alter table public.record_sets
  add constraint record_sets_failure_file_fkey foreign key (failure_file_id)
  references public.record_files (id) on delete set null;

/* ---------------- record_pages ---------------- */

create table public.record_pages (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null,
  file_id uuid not null,
  patient_id uuid not null,
  -- Page within its file, and the same page numbered across the set.
  page_number integer not null check (page_number > 0),
  set_page_number integer not null check (set_page_number > 0),
  status public.page_status not null default 'waiting',
  unreadable_reason public.unreadable_reason,
  attempts smallint not null default 0 check (attempts between 0 and 10),
  extracted_at timestamptz,
  constraint record_pages_file_fkey foreign key (file_id, set_id, patient_id)
    references public.record_files (id, set_id, patient_id) on delete cascade,
  constraint record_pages_key unique (id, set_id, patient_id),
  constraint record_pages_file_page_key unique (file_id, page_number),
  constraint record_pages_set_page_key unique (set_id, set_page_number),
  -- A reason only on an unreadable page; an unreadable page may have none when the pipeline cannot tell why.
  constraint record_pages_reason_only_when_unreadable check (unreadable_reason is null or status = 'unreadable')
);

create index record_pages_patient_idx on public.record_pages (patient_id);

/* ---------------- record_items ---------------- */

-- One typed item per extraction, always with the page it came from (task 3.9: no item without a source page). Items the
-- documents do not support are never written; an unreadable page yields one `unreadable` item pointing at it. After
-- dedupe, a duplicate points at its canonical item, so "one item with two sources" is the canonical row plus its
-- duplicates.
create table public.record_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null,
  patient_id uuid not null,
  source_page_id uuid not null,
  type public.record_item_type not null,
  label text not null check (char_length(label) between 1 and 500),
  value_text text check (char_length(value_text) <= 2000),
  value_numeric numeric,
  -- Keeps "12.0" from becoming "12" (SummaryQuantity.decimals).
  value_decimals smallint check (value_decimals between 0 and 6),
  unit text check (char_length(unit) <= 40),
  ref_low numeric,
  ref_high numeric,
  -- A calendar date as the document prints it.
  item_date date,
  confidence real check (confidence between 0 and 1),
  canonical_item_id uuid references public.record_items (id) on delete set null,
  -- Type-specific fields (dose, frequency, reaction ...), validated by lib/ai/schemas before anything is written.
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  constraint record_items_source_page_fkey foreign key (source_page_id, set_id, patient_id)
    references public.record_pages (id, set_id, patient_id) on delete cascade
);

create index record_items_set_id_idx on public.record_items (set_id);
create index record_items_source_page_idx on public.record_items (source_page_id);
create index record_items_canonical_idx on public.record_items (canonical_item_id) where canonical_item_id is not null;
create index record_items_patient_idx on public.record_items (patient_id);

/* ---------------- record_summaries ---------------- */

create table public.record_summaries (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null unique,
  patient_id uuid not null,
  -- The SummaryData body (components/brand/SummaryViewer.tsx: documents, conditions, procedures, medications,
  -- allergies, results, flags, unreadable), validated against the Summary schema in lib/ai/schemas before write.
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  generated_at timestamptz not null default now(),
  -- The licensed reviewer (rules T4, Q6): a professional the summary is shared with marks it reviewed.
  reviewed_by_professional_id uuid references public.professionals (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint record_summaries_set_fkey foreign key (set_id, patient_id)
    references public.record_sets (id, patient_id) on delete cascade,
  constraint record_summaries_id_patient_key unique (id, patient_id),
  -- A review always has its time; the reviewer is cleared if their listing is ever deleted, the time stays.
  constraint record_summaries_review check (reviewed_by_professional_id is null or reviewed_at is not null)
);

create index record_summaries_patient_idx on public.record_summaries (patient_id);

/* ---------------- record_shares ---------------- */

-- A patient shares a summary with one chosen professional until expires_at (shareLengthDaysOptions, default
-- business.shareDefaultDays) or until they end it. A different professional, an ended or an expired share is refused.
create table public.record_shares (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null,
  patient_id uuid not null,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  -- The upcoming visit the share was made for, when there is one (screen 27).
  booking_id uuid references public.bookings (id) on delete set null,
  -- What the professional sees about the patient (screen 36): first names and gender, copied from the profile when the
  -- share is made (trigger below; never from the client), as bookings copy them.
  patient_first_name_en text check (char_length(patient_first_name_en) between 1 and 100),
  patient_first_name_ar text check (char_length(patient_first_name_ar) between 1 and 100),
  patient_gender public.gender,
  shared_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  -- First opened by the professional (new, then viewed; reviewed comes from the summary).
  viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint record_shares_summary_fkey foreign key (summary_id, patient_id)
    references public.record_summaries (id, patient_id) on delete cascade,
  constraint record_shares_expiry check (expires_at > shared_at)
);

create index record_shares_professional_idx on public.record_shares (professional_id, expires_at);
create index record_shares_patient_idx on public.record_shares (patient_id);
create index record_shares_summary_idx on public.record_shares (summary_id);

/* ---------------- consents ---------------- */

-- Per-upload AI consent before payment (task 3.7, rule T3), share consent (screen 27), intake chat consent (task 3.12).
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.consent_kind not null,
  -- Which wording was shown: the message key and its version.
  copy_version text not null check (char_length(copy_version) between 1 and 80),
  locale public.app_locale not null,
  record_set_id uuid references public.record_sets (id) on delete set null,
  sharing_id uuid references public.record_shares (id) on delete set null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  constraint consents_withdrawn_after check (withdrawn_at is null or withdrawn_at >= granted_at)
);

create index consents_user_idx on public.consents (user_id, granted_at);
create index consents_record_set_idx on public.consents (record_set_id) where record_set_id is not null;

/* ---------------- ai_jobs ---------------- */

-- One records-pipeline run per set and attempt (screen 45). Per-call tokens and cost are L3's ai_calls rows; the totals
-- here are the job's running sums, which the per-job token cap (aiLimits.jobTokenCap) is checked against. A job outlives
-- its set (set_id goes null when the patient deletes it), so the AI cost history stays.
create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references public.record_sets (id) on delete set null,
  kind public.ai_job_kind not null default 'records',
  -- 1 for the first run; a retry after a failure is attempt 2 from the failed page, with the same quote.
  attempt smallint not null default 1 check (attempt >= 1),
  status public.ai_job_status not null default 'queued',
  step public.pipeline_step,
  -- Inngest functions are idempotent on this key (rigor review).
  idempotency_key text not null unique check (char_length(idempotency_key) between 1 and 200),
  -- [{ step, startedAt, finishedAt }] in pipeline order; steps not reached yet are absent.
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  -- Millionths of cost_currency (the AI vendor bills in aiLimits.costCurrency).
  cost_micros bigint not null default 0 check (cost_micros >= 0),
  cost_currency text not null check (cost_currency ~ '^[A-Z]{3}$'),
  failure_reason text check (char_length(failure_reason) <= 500),
  failure_page_id uuid references public.record_pages (id) on delete set null,
  inngest_run_id text check (char_length(inngest_run_id) <= 200),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint ai_jobs_attempt_key unique (set_id, attempt)
);

create index ai_jobs_status_idx on public.ai_jobs (status, created_at);

create trigger record_sets_set_updated_at before update on public.record_sets
  for each row execute function private.set_updated_at();
create trigger record_summaries_set_updated_at before update on public.record_summaries
  for each row execute function private.set_updated_at();
create trigger record_shares_set_updated_at before update on public.record_shares
  for each row execute function private.set_updated_at();
create trigger ai_jobs_set_updated_at before update on public.ai_jobs
  for each row execute function private.set_updated_at();

/* ---------------- guards ---------------- */

-- A share's two API writes: the patient ends it early, the professional it was made for opens it (once). Everything else
-- about a share is fixed when it is made. The caller only signals; the database stamps the time.
create function private.record_shares_guard_api_update() returns trigger
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
  if new.revoked_at is distinct from old.revoked_at then
    if not (is_patient and old.revoked_at is null and new.revoked_at is not null) then
      raise exception 'only the patient ends a share, once' using errcode = '42501';
    end if;
    new.revoked_at := now();
  end if;
  if new.viewed_at is distinct from old.viewed_at then
    if not (is_professional and old.viewed_at is null and new.viewed_at is not null) then
      raise exception 'only the professional it was made for records the first view' using errcode = '42501';
    end if;
    new.viewed_at := now();
  end if;
  return new;
end;
$$;

create trigger record_shares_guard_api_update before update on public.record_shares
  for each row execute function private.record_shares_guard_api_update();

-- A summary's one API write: a professional it is shared with marks it reviewed, as themselves, once; the database stamps
-- the time.
create function private.record_summaries_guard_api_update() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if new.reviewed_by_professional_id is distinct from private.my_professional_id() or old.reviewed_at is not null then
    raise exception 'a summary is marked reviewed once, by a professional it is shared with' using errcode = '42501';
  end if;
  new.reviewed_at := now();
  return new;
end;
$$;

-- A consent is withdrawn once, by its owner, at the time the database records; it is never granted again in place.
create function private.consents_guard_api_update() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if new.withdrawn_at is distinct from old.withdrawn_at then
    if old.withdrawn_at is not null or new.withdrawn_at is null then
      raise exception 'a consent is withdrawn once; a new consent is a new row' using errcode = '42501';
    end if;
    new.withdrawn_at := now();
  end if;
  return new;
end;
$$;

create trigger consents_guard_api_update before update on public.consents
  for each row execute function private.consents_guard_api_update();

create trigger record_summaries_guard_api_update before update on public.record_summaries
  for each row execute function private.record_summaries_guard_api_update();

-- The patient's first names and gender on a new share come from their profile, whatever the client sent.
create function private.record_shares_copy_patient() returns trigger
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

create trigger record_shares_copy_patient before insert on public.record_shares
  for each row execute function private.record_shares_copy_patient();

/* ---------------- receipts and refunds for records processing ---------------- */

-- A records payment (task 3.7) is a receipt with subject 'records' (file 4). The link goes null when the patient deletes
-- the set; the receipt stays.
alter table public.receipts
  add column record_set_id uuid unique references public.record_sets (id) on delete set null,
  add constraint receipts_records_have_no_booking check (subject = 'records' or record_set_id is null);
alter table public.refunds
  add column record_set_id uuid references public.record_sets (id) on delete set null,
  add constraint refunds_records_have_no_booking check (subject = 'records' or record_set_id is null);

/* ---------------- policy helpers ---------------- */

-- Sets the caller can read as a professional: those behind a live share addressed to them.
create function private.shared_set_ids() returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.set_id
    from public.record_shares sh
    join public.record_summaries s on s.id = sh.summary_id
   where sh.professional_id = private.my_professional_id()
     and sh.revoked_at is null
     and sh.expires_at > now();
$$;

create function private.is_own_draft_set(record_set uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.record_sets where id = record_set and patient_id = auth.uid() and status = 'draft');
$$;

create function private.is_own_summary(summary uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.record_summaries where id = summary and patient_id = auth.uid());
$$;

create function private.is_own_record_set(record_set uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.record_sets where id = record_set and patient_id = auth.uid());
$$;

create function private.is_own_share(share uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.record_shares where id = share and patient_id = auth.uid());
$$;

/* ---------------- privileges and policies ---------------- */

alter table public.record_sets enable row level security;
alter table public.record_files enable row level security;
alter table public.record_pages enable row level security;
alter table public.record_items enable row level security;
alter table public.record_summaries enable row level security;
alter table public.record_shares enable row level security;
alter table public.consents enable row level security;
alter table public.ai_jobs enable row level security;

revoke all on table public.record_sets, public.record_files, public.record_pages, public.record_items,
  public.record_summaries, public.record_shares, public.consents, public.ai_jobs from anon, authenticated;

grant select on table public.record_sets, public.record_files, public.record_pages, public.record_items,
  public.record_summaries, public.record_shares, public.consents, public.ai_jobs to authenticated;
grant insert (patient_id), delete on table public.record_sets to authenticated;
grant insert (set_id, patient_id, position, name, kind, mime_type, size_bytes, storage_path, sha256), delete
  on table public.record_files to authenticated;
grant update (reviewed_by_professional_id, reviewed_at) on table public.record_summaries to authenticated;
grant insert (summary_id, patient_id, professional_id, booking_id, expires_at), update (revoked_at, viewed_at), delete
  on table public.record_shares to authenticated;
grant insert (user_id, kind, copy_version, locale, record_set_id, sharing_id), update (withdrawn_at)
  on table public.consents to authenticated;

create policy record_sets_select on public.record_sets for select to authenticated
  using (
    patient_id = (select auth.uid())
    or id in (select private.shared_set_ids())
    or (select private.is_admin())
  );
create policy record_sets_insert_own on public.record_sets for insert to authenticated
  with check (patient_id = (select auth.uid()) and status = 'draft');
-- Any set but one the pipeline is working on (queued or processing): those are cancelled first, by server code.
create policy record_sets_delete_own on public.record_sets for delete to authenticated
  using (patient_id = (select auth.uid()) and status not in ('queued', 'processing'));

create policy record_files_select on public.record_files for select to authenticated
  using (
    patient_id = (select auth.uid())
    or set_id in (select private.shared_set_ids())
    or (select private.is_admin())
  );
create policy record_files_insert_own on public.record_files for insert to authenticated
  with check (patient_id = (select auth.uid()) and status = 'checking' and private.is_own_draft_set(set_id));
create policy record_files_delete_own on public.record_files for delete to authenticated
  using (patient_id = (select auth.uid()) and private.is_own_draft_set(set_id));

create policy record_pages_select on public.record_pages for select to authenticated
  using (
    patient_id = (select auth.uid())
    or set_id in (select private.shared_set_ids())
    or (select private.is_admin())
  );

create policy record_items_select on public.record_items for select to authenticated
  using (
    patient_id = (select auth.uid())
    or set_id in (select private.shared_set_ids())
    or (select private.is_admin())
  );

create policy record_summaries_select on public.record_summaries for select to authenticated
  using (
    patient_id = (select auth.uid())
    or set_id in (select private.shared_set_ids())
    or (select private.is_admin())
  );
create policy record_summaries_review on public.record_summaries for update to authenticated
  using (set_id in (select private.shared_set_ids()))
  with check (set_id in (select private.shared_set_ids()));

create policy record_shares_select on public.record_shares for select to authenticated
  using (
    patient_id = (select auth.uid())
    or (
      professional_id = (select private.my_professional_id())
      and revoked_at is null
      and expires_at > now()
    )
    or (select private.is_admin())
  );
create policy record_shares_insert_own on public.record_shares for insert to authenticated
  with check (
    patient_id = (select auth.uid())
    and private.is_own_summary(summary_id)
    and private.professional_is_verified(professional_id)
    and expires_at > now()
    and (booking_id is null or exists (
      select 1 from public.bookings b
       where b.id = booking_id and b.patient_id = (select auth.uid()) and b.professional_id = record_shares.professional_id
    ))
  );
create policy record_shares_update_patient on public.record_shares for update to authenticated
  using (patient_id = (select auth.uid()))
  with check (patient_id = (select auth.uid()));
create policy record_shares_update_professional on public.record_shares for update to authenticated
  using (professional_id = (select private.my_professional_id()) and revoked_at is null and expires_at > now())
  with check (professional_id = (select private.my_professional_id()));
create policy record_shares_delete_own on public.record_shares for delete to authenticated
  using (patient_id = (select auth.uid()));

create policy consents_select on public.consents for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy consents_insert_own on public.consents for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and withdrawn_at is null
    and (record_set_id is null or private.is_own_record_set(record_set_id))
    and (sharing_id is null or private.is_own_share(sharing_id))
  );
create policy consents_update_own on public.consents for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy ai_jobs_select_admin on public.ai_jobs for select to authenticated
  using ((select private.is_admin()));
