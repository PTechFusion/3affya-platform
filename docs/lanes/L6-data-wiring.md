# L6. Data wiring — branches `lane/data-<portal>` — the data half of tasks 2.1 to 2.8, 3.6, 3.10, 3.11

**Depends on:** L1 merged into `dev` (`supabase/migrations`, `lib/db/types.ts`, `lib/db/client.ts`, the dev seed).
**Not in this lane:** auth and gating (L7, runs alongside; pages keep reading the viewer through `lib/viewer.ts` until L7
replaces it), money writes (webhooks only, M3), the records pipeline, email sends.

Run as four parallel agents, one per surface, each on its own branch: `lane/data-public`, `lane/data-professional`,
`lane/data-patient`, `lane/data-admin`. They share nothing but `lib/data/` files they each create and the seed.

## Read
PLAYBOOK §2 route map and §9 portal facts. `lib/sample.ts` for your surface's accessors (the public surface is everything
before `sampleProfessional`; the portals follow their blocks). The generated types. The RLS policies in `supabase/migrations`
(what your queries may expect to see as which role). Each screen's brief for the states it must still reach.

## Deliverables
- `lib/data/<surface>/*.ts`: one typed query module per sample accessor your pages use, same function name and return shape
  as the `lib/sample.ts` accessor it replaces (so pages change only an import), reading through `lib/db/client.ts` with the
  request's role. Server only; mark `import "server-only"`.
- Each `page.tsx` of your surface switched from `@/lib/sample` to `@/lib/data/<surface>`. `?state=` query params keep
  working for loading, empty and error (an empty state must come from an empty result, not a flag, except `loading`).
  `generateMetadata` and `loading.tsx` untouched.
- Server actions of your surface made real where the write is not money: builder save and submit, availability save,
  settings, sharing consent, removal request, admin review decision, suspend, specialty edits, outreach revoke, with the
  audit_log row written in the same transaction. Money actions stay stubs that return `{ ok: false, error: "m3" }` with the
  copy key the screen already shows.
- The sample JSON for your surface stays for the screenshot script until L5's e2e suite runs against the seed; delete
  nothing from `data/sample` in this lane.

## Done when
- [ ] Every page of the surface renders from the seeded local database in both locales with the same screenshots as before
      (run `npm run screens` over your routes and compare)
- [ ] No `@/lib/sample` import remains in the surface's `page.tsx`, `layout.tsx` or `actions.ts`
- [ ] Non-money server actions persist and write audit rows; `tests/rls` still green
- [ ] `npm run check` green; `npm run test:unit` green

## Notes
- Where the schema and a sample shape differed (L1's report lists them), adapt the accessor, not the page, unless the page
  shows a field the schema does not have: then say so in the report and leave the field reading from a constant.
- Query timeouts come from the client factory; do not add per-call timeouts.

## Notes from L1 (20 Oct 2026)
- **Prerequisite (Yasir's decision 6).** Audit rows written in the same transaction as the change they record, and an
  atomic expertise-tag save and reorder, need RPC functions that do not exist yet. Before wiring those actions, list each
  action and the function signature it needs; L1 adds them in a follow-up migration (timestamp after `20261020001000`).
  Until then those actions are not done.
- Records files are read only through signed URLs that server code mints after checking the share is live:
  `createServiceClient({ kind: "system", name: "records-signer" })`, lifetime `storageRules.recordsSignedUrlSeconds`
  (600) in `config/business.ts`. A professional's own client gets no records object.
- Anon reads the tags, specialty links and availability of public listings on purpose (public profile, booking).
- Ambiguous PostgREST embeds need hints: `specialties!professionals_specialty_id_fkey`,
  `specialties!professional_specialties`, `profiles!professionals_user_id_fkey`, `record_files!record_files_set_fkey`.
- Every sample-shape difference is in `output/dev_seed_report.md`: specialty names are now the content document's card
  titles; `cityEn` is split into `city_en` and `state_code`; `languages` plus `arabic_dialect`; bookings carry first
  names; fee lines; ids are fixed uuids documented at the top of `supabase/seed.sql`.
- Screen 32's request rows read `public.introduction_requests` (the sample `int_003` goes there in the dev seed).
- Busy times for slot pickers: `rpc('professional_busy_times')`.
- The directory has doctors only (physicians and dentists); students and other professions have no listing.
- A deleted patient account keeps its lines without name or phone (the concern stays); a deleted professional account
  leaves the listing `removed`.
