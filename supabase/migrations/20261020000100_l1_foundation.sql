-- L1 schema v1 (task 1.4), file 1 of 9: extensions, the private schema, enums and generic trigger functions.
--
-- Conventions for every L1 migration:
--   * Every instant is timestamptz (UTC). Calendar dates printed on documents or registries are date.
--   * Money is integer minor units with a currency column beside it. No price, fee or period is inlined: those live in
--     config/business.ts and server code passes them in.
--   * Default deny twice over: RLS is enabled on every table, and each table starts with every privilege revoked from
--     anon and authenticated, then gets back only what its policies need. The service role bypasses RLS and is used by
--     server code only (lib/db/client.ts).
--   * Enum values follow the names lib/sample.ts already uses, so the screens' types map one to one.
--   * Helper functions used by policies live in schema `private`, which PostgREST does not expose.

create extension if not exists btree_gin with schema extensions;
-- Exclusion constraints on time ranges (no overlapping holds or bookings for one professional).
create extension if not exists btree_gist with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Roles (ADR-8). Mirrored from auth.users.raw_app_meta_data->>'role' into profiles.role by trigger (file 2).
create type public.user_role as enum ('patient', 'professional', 'admin');

create type public.app_locale as enum ('ar', 'en');
create type public.gender as enum ('f', 'm');

-- Directory (architecture, critical flow 3; lib/sample.ts ListingStatus without the derived "inReview").
create type public.professional_status as enum (
  'unclaimed', 'claimed', 'pending_review', 'verified', 'rejected', 'suspended', 'removed'
);
create type public.professional_source as enum ('nppes', 'self', 'admin');
create type public.visit_type as enum ('video', 'phone');
create type public.age_scope as enum ('adults', 'children', 'allAges');
create type public.board_status as enum ('certified', 'eligible');
create type public.credential_kind as enum ('licence', 'board', 'other');
create type public.credential_review_status as enum ('pending', 'accepted', 'rejected');

-- Availability and booking (ADR-7, critical flow 1).
create type public.availability_exception_kind as enum ('off', 'extra');
create type public.slot_hold_status as enum ('held', 'consumed');
create type public.booking_status as enum ('upcoming', 'done', 'cancelled', 'refunded');
create type public.age_group as enum ('baby', 'child', 'teen', 'adult');
create type public.booked_by as enum ('self', 'parent');
create type public.cancelled_by as enum ('patient', 'doctor', 'platform');
create type public.payment_wallet as enum ('applePay', 'googlePay');
create type public.refund_status as enum ('pending', 'succeeded', 'failed');
create type public.refund_reason as enum ('patientEarly', 'patientLate', 'doctor', 'platform', 'byRule', 'override');
create type public.refund_initiator as enum ('automatic', 'admin');

-- Memberships and the banner add-on (task 3.5).
create type public.membership_status as enum ('none', 'active', 'past_due', 'cancelled');
create type public.billing_interval as enum ('month', 'year');
create type public.invoice_status as enum ('paid', 'failed');

-- Outreach and removals (tasks 2.3, 2.8; screens 41 and 46).
create type public.invite_status as enum ('sent', 'opened', 'claimed', 'expired', 'bounced', 'revoked');
create type public.invite_bounce as enum ('noMailbox', 'rejected');
create type public.removal_status as enum ('open', 'infoRequested', 'confirmed', 'refused');
create type public.removal_reason as enum ('notListed', 'notPractising', 'wrongDetails', 'other');

-- Records pipeline (ADR-4; lib/records.ts). `draft` is a set that is still being uploaded, checked and quoted: it exists
-- before payment because uploads go to records/{patient_id}/{set_id}/.
create type public.record_set_status as enum ('draft', 'queued', 'processing', 'failed', 'done', 'cancelled');
create type public.pipeline_step as enum (
  'validate', 'quote', 'pay', 'extract', 'dedupe', 'summarise', 'flag', 'store', 'notify'
);
create type public.record_file_kind as enum ('pdf', 'docx', 'jpg', 'png', 'other');
create type public.record_file_status as enum ('checking', 'accepted', 'rejected');
create type public.record_reject_reason as enum ('type', 'archive', 'tooLarge', 'setFull', 'empty', 'encrypted', 'duplicate');
create type public.page_status as enum ('read', 'unreadable', 'reading', 'waiting', 'failed', 'notRead');
create type public.unreadable_reason as enum ('blurry', 'handwritten', 'cutOff');
create type public.pipeline_failure_reason as enum ('damaged', 'unavailable');
create type public.record_item_type as enum (
  'condition', 'medication', 'allergy', 'procedure', 'result', 'immunization', 'vital', 'unreadable', 'other'
);
create type public.ai_job_kind as enum ('records');
create type public.ai_job_status as enum ('queued', 'processing', 'failed', 'done', 'cancelled', 'retryQueued');
create type public.consent_kind as enum ('recordsProcessing', 'recordsShare', 'intakeChat');

-- Audit log (lib/audit.ts).
create type public.audit_actor_kind as enum ('admin', 'professional', 'patient', 'system');

-- Keeps updated_at current on every table that has one.
create function private.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Lower-case ASCII slug: accents folded, runs of anything else collapsed to one hyphen.
create function private.slugify(value text) returns text
language sql
stable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

-- Policy helpers are callable by the API roles (policies run as the caller) and by nobody else.
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated, service_role;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema private grant execute on functions to anon, authenticated, service_role;
