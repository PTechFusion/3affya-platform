-- L1 schema v1, file 9 of 10: Storage buckets (architecture Data section) with their object policies, and the
-- service-role-only security report the RLS suite (tests/rls) and the M4 hardening checklist read.

/* ---------------- buckets ---------------- */

-- Size ceilings mirror config/business.ts (recordsLimits.maxFileMb, credentialMaxMb, photoMaxMb; SI megabytes). The app
-- checks the same limits first; change both together.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('records', 'records', false, 50000000, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]),
  ('credentials', 'credentials', false, 20000000, array['application/pdf', 'image/jpeg', 'image/png']),
  ('cards', 'cards', true, 10000000, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

/* ---------------- object policy helpers ---------------- */

-- Path segments are text; comparing ids as text means a malformed path is simply refused, never a cast error.
create function private.is_own_draft_set_folder(folder text) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.record_sets where id::text = folder and patient_id = auth.uid() and status = 'draft'
  );
$$;

-- A set the pipeline is working on (queued or processing) keeps its files until it is cancelled by server code, as the
-- set row does (record_sets_delete_own).
create function private.is_set_folder_in_pipeline(folder text) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.record_sets where id::text = folder and status in ('queued', 'processing'));
$$;

-- A credential file whose review is decided is the review's evidence (rule A1): its owner can no longer delete it.
create function private.credential_object_is_decided(object_name text) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.credentials where storage_path = object_name and review_status <> 'pending');
$$;

/* ---------------- object policies ---------------- */

-- records/{patient_id}/{set_id}/{file}: the patient uploads into their own draft set and reads and deletes their own
-- files. Nobody else reads them through the API: a professional with a live share gets a signed URL that server code
-- mints with the service role after checking the share, for storageRules.recordsSignedUrlSeconds (10 minutes,
-- config/business.ts). A client that may select an object chooses its signed URL's lifetime, and a signed URL is never
-- checked against RLS again, so a direct read would let a link outlive the share.
create policy records_select on storage.objects for select to authenticated
  using (bucket_id = 'records' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy records_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'records'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_own_draft_set_folder((storage.foldername(name))[2])
  );
create policy records_delete_own on storage.objects for delete to authenticated
  using (
    bucket_id = 'records'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not private.is_set_folder_in_pipeline((storage.foldername(name))[2])
  );

-- credentials/{professional_id}/{file}: the professional uploads and reads their own, and deletes it while its review is
-- pending; admin reads to review.
create policy credentials_select on storage.objects for select to authenticated
  using (
    bucket_id = 'credentials'
    and (
      (storage.foldername(name))[1] = (select private.my_professional_id())::text
      or (select private.is_admin())
    )
  );
create policy credentials_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'credentials' and (storage.foldername(name))[1] = (select private.my_professional_id())::text);
create policy credentials_delete_own on storage.objects for delete to authenticated
  using (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = (select private.my_professional_id())::text
    and not private.credential_object_is_decided(name)
  );

-- cards/{professional_id}/photo/... and cards/{professional_id}/card/...: public to read by URL. The professional writes
-- only the photo folder; the card renderer (task 2.7) writes card/ as the service role, so a professional can never
-- replace the platform's ID card image.
create function private.is_own_photo_object(object_name text) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (storage.foldername(object_name))[1] = private.my_professional_id()::text
     and (storage.foldername(object_name))[2] = 'photo';
$$;

create policy cards_select_own on storage.objects for select to authenticated
  using (bucket_id = 'cards' and private.is_own_photo_object(name));
create policy cards_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'cards' and private.is_own_photo_object(name));
create policy cards_update_own on storage.objects for update to authenticated
  using (bucket_id = 'cards' and private.is_own_photo_object(name))
  with check (bucket_id = 'cards' and private.is_own_photo_object(name));
create policy cards_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'cards' and private.is_own_photo_object(name));

/* ---------------- removing a deleted set's files ---------------- */

-- Storage objects cannot be deleted from SQL, so deleting a record set (by the patient, or by the cascade of an account
-- deletion) queues its folder here in the same transaction, and a job (Inngest, task 3.10) removes the folder through the
-- Storage API and marks it purged. Not exposed: server code reads and marks the queue through the two functions below.
create table private.storage_purges (
  id bigint generated always as identity primary key,
  bucket_id text not null,
  prefix text not null check (prefix ~ '^[0-9a-f-]{36}/([0-9a-f-]{36}/)?$'),
  queued_at timestamptz not null default now(),
  purged_at timestamptz
);

alter table private.storage_purges enable row level security;
revoke all on table private.storage_purges from public, anon, authenticated, service_role;

create function private.record_sets_queue_purge() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.storage_purges (bucket_id, prefix) values ('records', old.patient_id::text || '/' || old.id::text || '/');
  return old;
end;
$$;

create trigger record_sets_queue_purge after delete on public.record_sets
  for each row execute function private.record_sets_queue_purge();

create function public.pending_storage_purges(max_rows integer default 100)
returns table (id bigint, bucket_id text, prefix text, queued_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.bucket_id, p.prefix, p.queued_at
    from private.storage_purges p
   where p.purged_at is null
   order by p.id
   limit least(greatest(max_rows, 1), 1000);
$$;

create function public.mark_storage_purged(purge_id bigint) returns boolean
language sql
security definer
set search_path = ''
as $$
  update private.storage_purges set purged_at = now() where id = purge_id and purged_at is null returning true;
$$;

revoke all on function public.pending_storage_purges(integer) from public, anon, authenticated;
revoke all on function public.mark_storage_purged(bigint) from public, anon, authenticated;
grant execute on function public.pending_storage_purges(integer) to service_role;
grant execute on function public.mark_storage_purged(bigint) to service_role;

/* ---------------- security report ---------------- */

-- What the RLS suite asserts about the whole schema, so a table added later without RLS or with a stray grant fails the
-- suite: RLS on every public table, no anon write privilege anywhere, no UPDATE/DELETE/TRUNCATE on audit_log for any API
-- role, and the audit_log triggers refusing even the table owner. The tamper probes run inside subtransactions that are
-- always rolled back, so they never change a row. Executable by the service role only.
create function public.schema_security_report() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  report jsonb := '{}'::jsonb;
  probe_id bigint;
  probe text;
begin
  report := report || jsonb_build_object(
    'tablesWithoutRls', coalesce((
      select jsonb_agg(c.relname order by c.relname)
        from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
    ), '[]'::jsonb),
    'tablesWithoutPolicies', coalesce((
      select jsonb_agg(c.relname order by c.relname)
        from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind in ('r', 'p')
         and not exists (select 1 from pg_catalog.pg_policy p where p.polrelid = c.oid)
    ), '[]'::jsonb),
    'anonWritePrivileges', coalesce((
      select jsonb_agg(c.relname || ':' || priv order by c.relname, priv)
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) as priv
       where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
         and (
           has_table_privilege('anon', c.oid, priv)
           or (priv in ('INSERT', 'UPDATE') and has_any_column_privilege('anon', c.oid, priv))
         )
    ), '[]'::jsonb),
    'auditLogMutationPrivileges', coalesce((
      select jsonb_agg(r || ':' || priv order by r, priv)
        from unnest(array['anon', 'authenticated', 'service_role']) as r
        cross join unnest(array['UPDATE', 'DELETE', 'TRUNCATE']) as priv
       where has_table_privilege(r, 'public.audit_log', priv)
          or (priv = 'UPDATE' and has_any_column_privilege(r, 'public.audit_log', priv))
    ), '[]'::jsonb)
  );

  select min(id) into probe_id from public.audit_log;
  if probe_id is null then
    report := report || jsonb_build_object('auditLogOwnerUpdate', 'noRows', 'auditLogOwnerDelete', 'noRows');
  else
    begin
      update public.audit_log set action = action where id = probe_id;
      raise exception using errcode = 'P0001', message = 'probe';
    exception
      when insufficient_privilege then probe := 'refused';
      when raise_exception then probe := 'allowed';
    end;
    report := report || jsonb_build_object('auditLogOwnerUpdate', probe);
    begin
      delete from public.audit_log where id = probe_id;
      raise exception using errcode = 'P0001', message = 'probe';
    exception
      when insufficient_privilege then probe := 'refused';
      when raise_exception then probe := 'allowed';
    end;
    report := report || jsonb_build_object('auditLogOwnerDelete', probe);
  end if;
  begin
    truncate public.audit_log;
    raise exception using errcode = 'P0001', message = 'probe';
  exception
    when insufficient_privilege then probe := 'refused';
    when raise_exception then probe := 'allowed';
  end;
  report := report || jsonb_build_object('auditLogOwnerTruncate', probe);
  return report;
end;
$$;

revoke all on function public.schema_security_report() from public, anon, authenticated;
grant execute on function public.schema_security_report() to service_role;
