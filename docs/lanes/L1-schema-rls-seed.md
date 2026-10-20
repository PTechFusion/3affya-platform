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

## Delivered (20 Oct 2026, PR #4)
Branch `lane/schema` into `dev`, commits M1.4 and M1.5 plus the 20 Oct round on the same branch. The lane report on the PR
gives the verification per done-when line.
- Ten migrations, `20261020000100_l1_foundation.sql` to `20261020001000_l1_introduction_requests.sql`: 27 tables in
  `public` (the 25 above plus `professional_private` and `introduction_requests`), RLS and column grants on each, guard
  triggers, the Storage buckets `records`, `credentials`, `cards` with their object policies, and
  `public.schema_security_report()` for the suite and the M4 checklist.
- `tests/rls/` (`npm run test:rls`), `lib/db/types.ts`, `lib/db/client.ts` (`createUserClient`, `createServiceClient`),
  `supabase/seed.sql` built from `data/sample/*.json` by `scripts/build_dev_seed.py`, and the four task 1.5 scripts with
  their reports in `output/`.

## Decisions that changed this lane's scope (Yasir, 20 Oct 2026)
- `introduction_requests` (file 10 of 10): screen 32's unpaid requests and the task 3.12 intake transcript. Open,
  booked, declined or withdrawn; the patient withdraws or deletes the transcript, the professional declines, the Stripe
  webhook links `booking_id` when a request is paid.
- `public.professional_busy_times(professional, from_at, to_at)` in file 4: live holds and bookings of a verified
  professional as bare intervals, for slot pickers; anon may call it.
- Doctors only: `seed_professionals.py` imports the sheets "Physicians High", "Physicians Medium" and "Dentists" (28,584
  doctors; the three doctor sheets hold 28,587 rows; 3 of them are denturists, who are not doctors), not "Other Professions" (37,398 rows, the 7,593 students among them) or "Low (review)". Doctors practising
  abroad are imported, with `practice_country` where the registry's state or city makes the country unambiguous.
- Taxonomy: every large group maps to its most logical card (402 of 589 codes mapped, the 20 Oct block at the end of
  `TAXONOMY_MAP` in `scripts/taxonomy_map.py`); on doctor rows every code that has a card is mapped.
- Specialty names: all 104 groups use the content document's card titles (`scripts/specialty_groups.py`); the 24
  prototype slugs stay. Body systems for the 80 new groups are still open.
- Account deletion: a professional's archives the listing (`removed`, `removed_at`; records kept); a patient's keeps
  every line without first names, phone, gender or transcript (the concern stays) and is refused while an upcoming visit
  stands.
- Not built: the RPC functions L6 needs for audit writes in the same transaction and an atomic tag save and reorder. L6
  lists the actions and signatures; L1 adds them in a follow-up migration.
