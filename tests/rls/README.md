# tests/rls: the RLS suite (task 1.4)

Proves, against the local Supabase stack, that row-level security and the grants in `supabase/migrations/` refuse every
cross-tenant attempt as a patient, a professional and an anonymous caller, that `audit_log` cannot be changed, that the
constraints and guard triggers hold the round-3 rules (paths, overlaps, done marks, account deletion, the purge queue)
and the round-4 ones (introduction requests, busy times, the concern kept on a deleted patient's lines), and that the
writes the policies do allow still work. Lane L1 owns this folder.

## Run it

```bash
npm run db:start      # once: the local stack (Docker must be running)
npm run test:rls      # vitest run --config tests/rls/vitest.config.ts
```

The suite reads `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from the environment, or, when they
are not set, from `npx supabase status -o env` at runtime. No key is written to a file or printed. If the stack does not
answer, the global setup stops the whole run with one message saying to start it.

Only `tests/rls/**/*.rls.ts` is picked up, so a plain `vitest` run elsewhere never touches the database. Files run one
after another. Each builds its own fixture world in `beforeAll` and removes it in `afterAll`; the world does not depend
on the dev seed. A run leaves two kinds of row behind, both by design. `audit_log` rows are append-only; theirs have a
`target_id` starting `rls-test-`. Deleting a record set (directly or through an account deletion) queues its storage
folder in `private.storage_purges`, which has no delete path through the API: cleanup removes the objects first and then
marks the run's queued folders purged with `mark_storage_purged`, so the purge job never sees them.

Other agents can write to the same database during a run (the registry import, for one). The suite never assumes a table
is empty and never counts a whole table. The import holds the advisory lock the slug trigger takes for its whole
transaction (about half a minute here, longer on a slower host), and PostgREST stops waiting for a lock after 8 s
(`55P03`), so the fixtures send an insert into `professionals` or `specialties` again while that lock is held, for up to
six minutes (`LOCK_WAIT_BUDGET_MS` in `support/fixtures.ts`); hooks may take ten. A file whose world is built during an
import starts late.

If vitest stops at startup with "Cannot find native binding", npm skipped rolldown's optional platform package
(npm/cli#4828). `npm ci` installs it now (vite is an explicit devDependency); otherwise reinstall `node_modules`, or add
the one missing `@rolldown/binding-<platform>` package at the version `node_modules/rolldown/package.json` names.

## Files

| File | What it covers |
|---|---|
| `vitest.config.ts` | The suite's own config: include pattern, node environment, sequential files, network-sized timeouts (ten-minute hooks, for the lock waits above), global setup. |
| `support/env.ts`, `support/global-setup.ts` | Finds the stack's URL and keys, checks Auth and PostgREST answer, hands them to the files via `provide`/`inject`. |
| `support/clients.ts` | Service, anon and signed-in clients (no persisted session, 30 s timeout per request); the exposed-tables lookup. |
| `support/totp.ts` | RFC 6238 TOTP on `node:crypto`, so the admin persona passes the TOTP step and holds an aal2 session. |
| `support/fixtures.ts` | Personas and the fixture rows in all 27 tables plus storage objects; the extra accounts, listings and booking rows a file adds (`addAccount`, `insertListing`, `bookingRow`); lock-wait retries; the purge-queue reader; cleanup in dependency order (records receipts, AI jobs and the purge queue included). |
| `support/refusal.ts` | The refusal definitions below, as assertions, plus storage variants (download, upload, list, sign). |
| `support/tables.ts` | The matrix as data: per table, the target row of each operation and who may read it. |
| `matrix.rls.ts` | 27 tables x 3 attackers x SELECT/INSERT/UPDATE/DELETE, each with an owner control. |
| `controls.rls.ts` | Positive controls, admin aal2 versus aal1, admin writes nothing, the refusal checks are not vacuous (each fails with its own "allowed" message). |
| `roles.rls.ts` | `profiles.role` mirrors `app_metadata.role`; unknown roles refused; a user cannot change its own role. |
| `audit-log.rls.ts` | `audit_log` update and delete fail for every role; `schema_security_report()`; self-naming inserts only; `actor_system` is server code's, on system entries only; each role's own event vocabulary and listings; size caps. |
| `guards.rls.ts` | Guard triggers: listing status, verified board and licence details, `prepared` versus `done_at`. |
| `slot-holds.rls.ts` | One hold per slot (unique constraint), one live hold per patient (unique index), no overlap (exclusion), the four-hour span, bookable listings only, the one-hour expiry ceiling, the concern and its language together. |
| `bookings.rls.ts` | No overlapping live bookings (exclusion); the done mark (started visits only, status follows, stamped); account deletion refused while a visit is ahead, then the bookings kept without names and phone (concern kept); receipt and refund subjects. |
| `records.rls.ts` | `storage_path` allowlists on `record_files` and `credentials`; deleting a record set (not while the pipeline works on it), the purge queue and its two service-only functions; AI jobs and records receipts outlive the set. |
| `shares.rls.ts` | Live share versus none, revoked or expired: reads, `viewed_at` once, reviewed once; a new share's names and gender come from the profile; a named booking must be with the same professional. |
| `storage.rls.ts` | `records`, `credentials` and `cards` buckets: download, list, sign, overwrite, move, upload and delete across tenants; nobody but the patient reads records objects; a decided credential's file outlives the decision; the professional writes only its own `photo/` folder. |
| `stamps.rls.ts` | The database stamps `viewed_at`, `revoked_at`, `reviewed_at`, `done_at`, `withdrawn_at` and `deletion_requested_at` whatever time the client sends; one-way withdrawal; the clears an owner may make. |
| `introductions.rls.ts` | Round 4, `introduction_requests`: who sends (own request, verified listing, future time, own intake consent; names and gender from the profile), who reads, the one-way moves (withdraw, decline) and their stamps, the transcript only the patient deletes, the checklist, the webhook's booked mark, account deletion. |
| `busy-times.rls.ts` | Round 4, `professional_busy_times`: bare intervals of a verified listing's live holds and bookings for anon and signed-in callers; expired holds, cancelled visits, unverified listings and bad ranges answer nothing. |
| `listings.rls.ts` | The registry snapshot when a listing leaves unclaimed, and who reads it; an unclaimed row has no account; deleting the account behind a verified listing takes it down; US-only state codes; bounded training; the `listing-<last4>` slug; no duplicate languages or visit types; bounded specialty synonyms and Stripe requirement lists. |

## Counts

758 tests in 14 files, all passing on the local stack after a clean `npm run db:reset` with the ten migrations (20 Oct
2026, about 40 s): `matrix.rls.ts` 353, `controls.rls.ts` 129, `audit-log.rls.ts` 46,
`storage.rls.ts` 41, `introductions.rls.ts` 32, `listings.rls.ts` 29, `records.rls.ts` 26, `slot-holds.rls.ts` 21,
`shares.rls.ts` 19, `bookings.rls.ts` 16, `guards.rls.ts` 16, `stamps.rls.ts` 12, `roles.rls.ts` 9, `busy-times.rls.ts` 9.
Round 4 added `introductions.rls.ts` and `busy-times.rls.ts`, the `introduction_requests` case in the matrix (340 to
353) and its owner and admin controls (124 to 129), and changed the account-deletion case in `bookings.rls.ts` (the
concern stays); a withdrawn intake consent is refused and a past range of busy times answers nothing. Round 3 ended with 699 in 12 files; round 2 with 611 in 10 files (8 of them failed on the round-3 schema
before that update). Round 3 added `bookings.rls.ts` and `records.rls.ts` and grew `audit-log.rls.ts`
(34 to 46), `storage.rls.ts` (28 to 41), `listings.rls.ts` (18 to 29), `slot-holds.rls.ts` (17 to 21) and
`shares.rls.ts` (13 to 19).

## Personas

Each test file creates them fresh, with a unique run id, through the Auth admin API. They sign in with email and
password, on `example.com` addresses.

| Persona | Role | What it has |
|---|---|---|
| patientA | patient | Its own live hold, booking (with professional A, days ahead), a second booking with professional A that started an hour or two ago (the one a professional may mark done), receipt, refund, done set and draft set with file, page, item, summary, consent, and an open introduction request to professional A (concern and transcript). |
| patientB | patient | The same (one booking and one request, with professional B), plus a live share of set B to professional B and an expired share of set B2. |
| professionalA | professional | A verified listing: accepting new patients, Stripe charges and payouts on, so `can_take_bookings` is true. |
| professionalB | professional | The same, plus tag, credential, availability, membership, banner, invite and removal request (as A has). |
| professionalPending | professional | A `pending_review` listing with its own tag, specialty link and availability (not public). |
| admin | admin | TOTP factor enrolled and verified: an aal2 session. |
| adminNoTotp | admin | An aal1 session: the admin role without the TOTP step. |
| anon | none | The anon key and no session. |

NPIs are synthetic: valid format (`^[12][0-9]{9}$`) with a deliberately wrong Luhn check digit. A real NPI always passes
the check, so a synthetic one can never collide with an imported registry row; a collision with another run is retried.
Every fixture storage path follows the round-3 allowlist (`<id>/<set>/<name>` and `<id>/<name>`, names of letters,
digits, `_` and `-` with one extension).

## How a refusal is defined

- **SELECT**: the target row is not returned. Neither is any row of that tenant, under the tenant filters listed below.
  An empty result and permission denied (`42501`) both count. The service client first shows the row exists.
- **INSERT**: the database answers `42501` (row-level security violation, or no privilege). Payloads are otherwise valid,
  so any other error counts as a hole: a check, unique or foreign-key violation means the row got past RLS. Inserts use
  `return=minimal`, so the refusal comes from the insert, not from reading the row back.
- **UPDATE** and **DELETE**: `42501`, or zero rows affected (`count=exact`). In both cases the service client re-reads
  the target, which must be unchanged (or still there).
- **Storage**: 400, 403 or 404, after the service client has downloaded the object. The Storage API reports objects RLS
  hides as not found. A refused upload must leave no object behind. A refused list is that answer or an empty list,
  after the service client has listed the object under the same prefix; a refused signature mints no URL.

A rule the database holds with a constraint rather than RLS (a path, an overlap, a size cap) is checked by its own code
and constraint name: `23514` for a check, `23P01` for an exclusion, after the call has passed RLS.

Every table's case starts with a control: the target rows exist and their owner can read them. `controls.rls.ts` also
runs each check against the owner doing the same thing and expects it to fail with that check's "allowed" message (rows
visible, insert accepted, rows affected, downloaded, upload accepted), so a check cannot pass by accident and the
meta-test cannot pass on an unrelated error.

## The matrix (`matrix.rls.ts`)

Attackers: **patient A**, **professional A**, **anonymous**. Each attacker runs SELECT, INSERT, UPDATE and DELETE on all
27 tables: 324 attempts. `controls.rls.ts` runs the 81 writes again as the **aal2 admin**, since admin writes go through
server code only. "B" means patient B or professional B. Where professional B's rows are public by design (listing,
specialty links, tags, availability), the SELECT target is the pending listing's row instead.

| Table | Tenancy | SELECT target (and tenant filters) | INSERT attempt | UPDATE / DELETE target |
|---|---|---|---|---|
| profiles | the account's own row | patient B's profile | a row with patient B's id | patient B's profile |
| specialties | no tenant; hidden rows admin-only | the hidden specialty; any `shown=false` | a new specialty | the shown specialty |
| professionals | public when verified/unclaimed; owner edits | the pending listing; any `pending_review` | a new listing | professional B's listing |
| professional_private | the listing's professional | professional B's row | a row for professional B | professional B's row |
| professional_specialties | public with a public listing | the pending listing's link | a link for professional B | professional B's link |
| expertise_tags | public with a public listing; owner writes | the pending listing's tag | a tag on professional B | professional B's tag |
| credentials | the professional | professional B's credential | a credential for professional B | professional B's credential |
| availability_rules | public for verified listings; owner writes | the pending listing's rule | a rule for professional B | professional B's rule |
| availability_exceptions | public for verified listings; owner writes | the pending listing's exception | an exception for professional B | professional B's exception |
| slot_holds | the patient | patient B's hold (by patient, by professional B) | a hold for patient B | patient B's hold |
| bookings | the patient and its professional | patient B's booking (by patient, by professional B) | a booking for patient B | patient B's booking |
| receipts | the patient | patient B's receipt (by patient, by booking) | a receipt on B's booking | patient B's receipt |
| refunds | the patient | patient B's refund (by patient, by booking) | a refund on B's booking | patient B's refund |
| memberships | the professional | professional B's membership | a membership for professional B | professional B's membership |
| banners | the professional | professional B's banner | a banner for professional B | professional B's banner |
| invites | no tenant; admin-only | professional B's invite | an invite for professional B | professional B's invite |
| removal_requests | no tenant; admin-only | professional B's request | a request for professional B | professional B's request |
| record_sets | the patient; a live share's professional | patient B's set | a set for patient B | set B / B's draft set |
| record_files | the patient; a live share's professional | patient B's file (by patient, by set) | a file in B's draft set | file B / B's draft file |
| record_pages | the patient; a live share's professional | patient B's page (by patient, by set) | a page in set B | patient B's page |
| record_items | the patient; a live share's professional | patient B's item (by patient, by set) | an item in set B | patient B's item |
| record_summaries | the patient; a live share's professional | patient B's summary (by patient, by set) | a summary for B's draft set | patient B's summary |
| record_shares | the patient; the professional while live | B's share (by patient, by professional B) | a share of B's summary to A | patient B's share |
| consents | the account | patient B's consent | a consent for patient B | patient B's consent |
| ai_jobs | no tenant (hangs off a set); admin-only | the job on set B | a job on set B | the job on set B |
| audit_log | no tenant; admin-only; append-only | the fixture row | a row naming another account | the fixture row |
| introduction_requests | the patient and the addressed professional | patient B's request (by patient, by professional B) | a request for patient B to professional B | patient B's request (withdraw; decline as professional A) |

A further test fails if PostgREST exposes a `public` table with no case here. `stripe_events` (L2) and `ai_calls` (L3)
are the exceptions; their lanes cover them.

## The other checks

- **Positive controls** (`controls.rls.ts`):
  - Every owner reads its own row in each table it owns. Anon and signed-in users read verified and unclaimed listings,
    their specialty links, tags and availability, and shown specialties. Anon reads nothing of the pending listing or
    its children, and nobody else reads a listing that is claimed, rejected, suspended or removed, or its children.
  - Professional A updates its bio and manages its own availability rules, exceptions and tags. Patient A renames
    itself, creates a draft set (but not a non-draft one), adds a file row to its draft set (but not to a done set),
    records a consent, and shares its summary with a verified professional (but not with the pending one).
  - A listing the service client moves to `claimed` is submitted to `pending_review` by its own professional.
  - The aal2 admin reads a row from each of the 27 tables. adminNoTotp reads none of the admin-only rows.
  - The meta-test: each refusal check, run against the owner doing the allowed thing, fails with its own message.
- **Roles** (`roles.rls.ts`): createUser with each role, and with none (patient). `updateUserById` moves the role each
  way. An unknown role is refused at createUser (no account, no profile) and at update (the role stays). A user cannot
  write `profiles.role`, and a role in `user_metadata` is ignored.
- **audit_log** (`audit-log.rls.ts`):
  - UPDATE and DELETE fail with `42501` for patient, professional, aal2 admin, aal1 admin, anon and the service role,
    and the row is unchanged. `schema_security_report()` returns empty lists, and `refused` for the owner update, delete
    and truncate probes (a row exists first). Only the service role may call it.
  - Patient, professional and aal2 admin append rows naming themselves, each with an event of its own vocabulary.
    Naming another account, another role or `system` is refused, as is an admin row without TOTP, a back-dated
    `created_at`, and any anon insert. `actor_system` cannot be written by patient, professional or aal2 admin, even on
    a row naming itself (column not granted, `42501`); the service client cannot put it on an entry whose actor is not
    the system (`23514`, `audit_log_actor_system`), store one that is not lower snake case, or append a system entry
    without one (`audit_log_system_named`), and does store one on a system entry.
  - Vocabulary (round 3): a patient cannot append `verification.approved` or `listing.edited`, nor `share.created` naming
    a listing it has no booking or share with (professional B before the share, the pending listing); after sharing its
    summary with professional B it appends `share.created` naming B, and `booking.cancelled` naming the professional of
    its booking. A professional cannot append `share.created`, `booking.cancelled` or `verification.approved`, nor name
    another listing; it appends `listing.edited` naming its own.
  - Size caps: the service client cannot store `changes` or `details` over 32 KB, `verification` over 16 KB or `note`
    over 8 KB (`23514`, `audit_log_<column>_check`); an entry of the same shape at 4 KB is stored.
- **Guards** (`guards.rls.ts`):
  - The pending professional cannot verify itself. A verified one cannot move its listing to any other status, or change
    `board_name`, `board_status`, `licence_state` or the licence number. It can still change its video link and bio, and
    an unverified listing can change board name and licence number.
  - A patient cannot set `done_at` and a professional cannot set `prepared`; each can set its own (the professional on
    the visit that has started). Neither writes any other booking column.
- **Slot holds** (`slot-holds.rls.ts`):
  - Each patient first lets go of its fixture hold. A second hold on the same (`slot_start`, `professional_id`) fails with
    `23505` on `slot_holds_one_hold_per_slot`, while another patient's hold does not stop a patient holding its own slot.
  - A patient holding a slot cannot hold a second one, with the same or another professional: `23505` on
    `slot_holds_one_live_hold_per_patient`. After letting go it holds again. A hold the service client marks consumed does
    not block a new one, and the patient cannot delete the consumed hold.
  - A hold is refused when the listing is pending, cannot take payouts, or is not accepting new patients. The same
    listing can be held again once restored.
  - An expiry past one hour fails with `23514` on `slot_holds_expiry_ceiling`. Past slots, a forged status and a forged
    payment intent are refused, and so is a concern without its language or the reverse (`slot_holds_concern_locale`).
  - Round 3: a hold overlapping another hold of the same professional with a different start fails with `23P01` on
    `slot_holds_no_overlap`; a hold of four hours and a minute fails with `23514` on `slot_holds_slot_span` (four hours is
    accepted); the slot right after a held one (its end is the next start) can be held.
- **Bookings** (`bookings.rls.ts`, rows written by the service client, as the webhook writes them):
  - A live booking (upcoming or done) overlapping booking A with a different start fails with `23P01` on
    `bookings_no_overlap`; a cancelled or a refunded one may overlap it; two professionals' visits at the same time do
    not conflict.
  - Professional A cannot mark the visit still ahead done, nor a cancelled or refunded visit that has started (`42501`).
    Marking the visit that has started done stores status `done` and the database's now(); clearing the mark returns it
    to `upcoming`. Status `done` without `done_at` fails with `23514` on `bookings_done_have_time`, update or insert. The
    checklist takes no item twice (`bookings_prepared_check`).
  - Account deletion: the Auth admin API refuses to delete a patient with a visit still ahead (the account, profile and
    bookings stay). Once that visit is cancelled the delete succeeds, and both bookings (the cancelled one and a done
    one) keep their row with `patient_id`, first names and phone null, the concern and its language kept (decision 4,
    20 Oct 2026), fee and payment intact.
  - Subjects: a `records` receipt with a booking, a `booking` receipt without one and a `booking` receipt naming a set
    fail with `23514` (`receipts_subject`, `receipts_records_have_no_booking`); refunds follow the same rules
    (`refunds_subject`, `refunds_records_have_no_booking`); a records receipt for a set and a booking receipt for a visit
    are stored.
- **Records** (`records.rls.ts`):
  - Paths: a `record_files` row in the patient's own draft set and a `credentials` row in the professional's own folder
    are refused (`23514`, `record_files_path_in_set_folder`, `credentials_path_in_own_folder`) with `..` segments up
    into another tenant's folder, the `%2e%2e` form, a `./` segment, a backslash, an extra segment or a space; the
    service client is held to the same paths; `<patient>/<set>/f1-scan.pdf` and `<professional>/f1-scan.pdf` work.
  - Deleting sets: patient A cannot delete its queued or its processing set (zero rows), and deletes its draft and its
    done set. The done set's AI job survives with `set_id` null and its records receipt with `record_set_id` null. Each
    deleted set's `{patient}/{set}/` folder is in `pending_storage_purges` once; `mark_storage_purged` marks it (true),
    a second mark does not, and it leaves the pending list. Deleting a patient's account queues its sets' folders the
    same way. A set nobody deleted is not queued. Anon, patient A, professional A and the aal2 admin can call neither
    function (`42501`).
- **Shares** (`shares.rls.ts`):
  - With a live share, professional B reads set B's set, summary, items, pages, files and the share. It sets `viewed_at`
    once and marks the summary reviewed once, in its own name only, and cannot end the share.
  - Professional A reads and writes none of it. Professional B reads nothing of the set whose share expired.
  - After patient B ends the share (and cannot reopen it), professional B reads none of it while patient B still does.
  - Making a share (round 3): the patient cannot send `patient_first_name_en`, `patient_first_name_ar` or
    `patient_gender` (not insert-granted, `42501`); the share it makes carries its profile's values, and a service
    client insert with other values stores the profile's too. A share naming the patient's booking with a different
    professional, or another patient's booking, is refused; naming its booking with that same professional works.
- **Storage** (`storage.rls.ts`):
  - Patient A, professional A, anon and adminNoTotp cannot download patient B's object. Patient A cannot list (the service
    client and patient B list it under the same prefix), delete, overwrite or move it. Patient A cannot upload into B's
    folder, under its own id into B's set, or into its own non-draft set, but can upload into its own draft set. It
    cannot delete the files of its own set while the pipeline works on it (queued or processing), and can once it stops.
  - Round 3: professional B, with a live share, cannot download, list or sign the shared set's file through its own
    client (server code mints the link after checking the share); nor for the expired set, nor after revocation. Patient
    B signs its own file (the link serves it) and still downloads it after ending the share.
  - Credentials: only the professional and the aal2 admin read them; patients, other professionals, anon and adminNoTotp
    cannot. No uploads or deletes into another folder. The owner cannot delete the file of a credential that was accepted
    or rejected; it can delete the file of a pending one while its row is still there, and then the row.
  - Cards (round 3): professional A cannot upload, upsert, replace, move or delete in professional B's folder, nor move
    its own photo there; it cannot write the renderer's `card/` folder (new object, upsert or delete) nor its own folder
    outside `photo/`. Patient A, anon and adminNoTotp cannot upload, upsert or delete. Professional A uploads, replaces and
    deletes a photo in its own `photo/` folder, and anon fetches a photo by its public URL (200, same bytes).
- **Stamps** (`stamps.rls.ts`):
  - Professional B records the first view of a share and marks the summary reviewed, patient B ends the share,
    professional A marks the visit that has started done, patient A withdraws a consent and requests the deletion of its
    account, each sending a far-past (or far-future) time: the stored value is the database's now(), within a minute. A
    service-role write keeps the time it sends.
  - A withdrawn consent cannot be taken back or re-dated, earlier or later (`42501`). Professional A clears `done_at`
    (marked by mistake) and patient A clears its deletion request (keep my account).
- **Listings** (`listings.rls.ts`):
  - Registry snapshot: a registry row the service client claims (user_id and status `claimed` in one statement) gets
    `professional_private.registry_as_filed` with the values from before the claim (changes in the same statement
    excluded). Submitting for review, going back to unclaimed (account unlinked in the same statement) and a second
    claim keep the first snapshot. Anon, patient A, professional A and adminNoTotp cannot read it; the listing's
    professional and the aal2 admin can; the professional cannot rewrite it.
  - Unclaimed rows (round 3): the service client cannot insert an unclaimed row with a `user_id`, nor link an account to
    an unclaimed row without claiming it (`23514`, `professionals_unclaimed_no_account`); claiming in one statement works
    and snapshots.
  - Account deletion: deleting the account behind a verified listing through the Auth admin API succeeds and leaves the
    listing `removed`, with `removed_at` set and no `user_id`; anon and signed-in users no longer read it.
  - States and bounds: `state_code` 'ON' (Ontario) and 'AE' (military mail) fail with `23514`, 'TX' works;
    `licence_state` 'ON' fails on a listing not yet verified; `practice_country` is not writable and follows a state set
    in the builder ('US'); training of 21 lines, with a 301-character line or with an empty line fails with `23514`, and
    20 lines of 300 characters are accepted; a null entry in training, languages or visit types fails.
  - Round 3: a listing whose names and city are Arabic only gets the slug `listing-<last four NPI digits>` (the whole NPI
    when another listing has that slug already); a language or visit type listed twice fails with `23514`, for the
    professional and the service client, and each once is accepted.
  - Lists server code writes (round 3): a specialty's synonyms of 51 entries, with a 61-character, an empty or a null
    entry fail with `23514` (50 of 60 characters are stored); a Stripe requirement list (`stripe_currently_due`,
    `stripe_past_due`) with a null entry fails with `23514`.
- **Introduction requests** (`introductions.rls.ts`, round 4):
  - Sending: patient A sends a request to a verified listing; it is `open`, `received_at` is now, and it carries the
    first names and gender of its profile. Sending `patient_first_name_en`, `patient_first_name_ar`, `patient_gender`,
    `status`, `booking_id`, `received_at`, `answered_at` or `withdrawn_at` is refused (not insert-granted, `42501`); a
    service-client insert with other names stores the profile's too. Refused (`42501`): a request naming another
    patient, one to the pending listing or to an unclaimed registry listing, a requested time in the past, and one naming
    patient B's intake consent or patient A's own records consent; naming its own `intakeChat` consent works. A concern
    without its language, a transcript that is not an array and one over 64 KB fail with `23514`.
  - Reading: the addressed professional reads the request with its concern and transcript, and the patient reads its
    own; professional B, patient B and anon read none of patient A's requests.
  - Moves: patient A withdraws an open request (the database stamps `withdrawn_at`) and cannot reopen it; professional
    A cannot decline a withdrawn one. Professional A declines an open request (`answered_at` stamped); it cannot withdraw
    one, mark one booked or reopen a declined one, and patient A cannot withdraw a declined one, decline its own or mark
    it booked. Neither writes `withdrawn_at` or `answered_at` itself (`42501`).
  - Transcript and checklist: patient A ticks `prepared`; professional A cannot. Professional A can neither delete nor
    rewrite the transcript; patient A cannot rewrite it (or empty it to `[]`), deletes it (null; the request stays and
    the professional still reads it) and cannot bring it back.
  - Server code: `booked` without `answered_at` fails with `23514` (`introduction_requests_answered`); with a booking and
    `answered_at` it is stored, and then neither side moves it. One booking answers one request (`23505`); `withdrawn`
    without `withdrawn_at` fails (`introduction_requests_withdrawn`).
  - Account deletion: deleting the patient through the Auth admin API keeps the request with `patient_id`, first names,
    gender, transcript and the (cascaded) consent link null; status, professional, time, visit type, concern and its
    language stay, and the professional still reads the line.
- **Busy times** (`busy-times.rls.ts`, round 4):
  - Anon, patient A and professional A calling `rpc('professional_busy_times')` for professional B over the next week
    get exactly two rows, each with only `starts_at` and `ends_at`: patient B's live hold and upcoming booking (fixture
    rows). An expired hold still `held` (another patient's) and a cancelled booking inside the same range are not in it,
    and no patient id, row id, concern, name, payment intent or visit type appears in the answer.
  - Nothing comes back while the listing is `pending_review` or `suspended` (it answers again once verified), for a
    reversed range, an empty range, or a range of 100 days and a minute; a range of exactly 100 days answers.
