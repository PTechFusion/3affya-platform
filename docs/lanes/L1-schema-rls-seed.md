# L1. Schema v1, RLS and seed — branch `lane/schema` — tasks 1.4, 1.5

**Depends on:** nothing (local Supabase via the CLI; the VPS stack from L0 is a later target, same migrations).
**Not in this lane:** `stripe_events` (L2), `ai_calls` (L3), any page change, auth flows (L7), Stripe or pipeline logic.

## Read
Architecture: Data section, ADR-5 (seeding), ADR-7 (calendar), ADR-8 (auth and roles), Rigor review (indexes), Critical flow 1
(holds). Tasks 1.4 and 1.5 verbatim. Every `data/sample/*.json` with `data/sample/README.md` and the typed accessors in
`lib/sample.ts`: those are the shapes the 47 screens read. `config/business.ts` for retention, hold minutes, grace periods.

## Deliverables
- `supabase/config.toml`, `supabase/migrations/*.sql` (one file per table group, in dependency order), `supabase/seed.sql`
  (small synthetic dev seed: the sample doctors, specialties, one patient, one admin, the sample bookings; derive it from
  `data/sample/*.json` so dev data equals prototype data).
- Tables (from the architecture Data section): `profiles`, `professionals`, `specialties`, `professional_specialties`,
  `expertise_tags` (professional_id, title max 30, nugget max 500, position, locale), `credentials`, `availability_rules`,
  `availability_exceptions`, `slot_holds`, `bookings`, `receipts`, `refunds`, `memberships`, `banners`, `invites`,
  `record_sets`, `record_files`, `record_pages`, `record_items` (typed, with `source_page_id`), `record_summaries`,
  `record_shares`, `consents`, `ai_jobs`, `audit_log`, `removal_requests`. Plus the enums the sample data implies
  (`professional_status`: unclaimed, claimed, pending_review, verified, rejected, suspended, removed; booking, refund,
  membership, invite, removal and ai_job statuses as `lib/sample.ts` names them).
- Every instant `timestamptz` (UTC). Every money column integer minor units with a currency column. Slugs
  `firstname-lastname-city-npiSuffix` unique. Indexes: `professionals(status, specialty, language, location)`,
  `slot_holds(slot_start, professional_id)` with the unique constraint that prevents a double hold, `record_items(set_id)`,
  `audit_log(created_at)`, `invites(token_hash)`.
- `profiles.role` mirrored from `auth.users.raw_app_meta_data->>'role'` by trigger. `audit_log` insert-only (no update or
  delete grant to any role, including service role where Postgres allows it; at minimum a trigger that raises on update/delete).
- RLS enabled on every table, default deny. Policies: patients read and write their own rows; professionals their own
  professional, availability, bookings, shares addressed to them; anonymous reads only `professionals` rows with status
  verified or unclaimed plus `specialties`; admin role reads everything and writes through server code only.
- `tests/rls/`: vitest suite against the local stack that, for every table, attempts a cross-tenant SELECT, INSERT, UPDATE
  and DELETE as patient A against patient B's rows, as professional, and as anonymous, and expects every one refused.
  Includes the `audit_log` update attempt. Runs with `npm run test:rls`.
- `lib/db/types.ts` from `supabase gen types typescript --local`, committed. `lib/db/client.ts`: one server-side client
  factory (anon for the request's user, service role only inside server code that checks the admin role), with the
  query timeout set.
- Seed scripts (task 1.5, Python under `scripts/`, run once, idempotent): `seed_specialties.py` (104 rows, Arabic and English
  names, slugs, from `data/sample/specialties.json` plus the content PDF list), `map_taxonomy.py` (NPPES taxonomy codes to the
  104 groups; unmapped codes to `output/taxonomy_exceptions.csv`, never defaulted), `seed_professionals.py` (shortlist to
  `professionals` as unclaimed, source nppes, idempotent on NPI), `enrich_cms.py` (CMS file join on NPI, report to
  `output/cms_join_report.md`). The shortlist and CMS file are not in the repo; scripts take their paths as arguments and
  the report says what ran.

## Done when (tasks 1.4 and 1.5)
- [ ] Migrations create every table above with foreign keys and the named indexes
- [ ] `profiles.role` mirrors `app_metadata.role` via trigger
- [ ] RLS on every table; `tests/rls` refuses every cross-tenant attempt as patient, professional and anonymous
- [ ] `audit_log` update attempt fails in the test
- [ ] `supabase gen types` output committed as `lib/db/types.ts`
- [ ] `seed_specialties.py` inserts 104 rows; `map_taxonomy.py` writes exceptions, never defaults
- [ ] `seed_professionals.py` idempotent on NPI (second run changes zero rows); `enrich_cms.py` writes its report
- [ ] Each professional has a stable slug `firstname-lastname-city-npiSuffix`
- [ ] `npm run check` green; the app still builds and renders from sample data

## Notes
- Allowed additions: `supabase` CLI (devDependency, pinned), `@supabase/supabase-js` (pinned), `vitest` if L5 has not
  landed it (pinned; coordinate by keeping the same version L5 names: check `dev` before adding).
- `.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (local defaults in
  comments).
- Where a sample shape and the architecture disagree, the architecture wins; list each such change in your report so L6
  knows which accessors must adapt.
