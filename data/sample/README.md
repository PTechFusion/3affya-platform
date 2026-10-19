# Sample data

Synthetic, for the prototype only. Never put a real patient document or a real NPI record here; real registry data arrives through `scripts/` in task 1.5 and real patient data never leaves production.

- `doctors.json`: 20 doctors, 8 verified, 4 pending, 8 unclaimed. Field names match the planned schema (task 1.4).
- `specialties.json`: 24 of the 104 specialty groups, bilingual, with sample counts. The full list comes from the content document in task 1.5.
- `bookings.json`: three bookings in the three money states the patient portal shows. Amounts in minor units; the three lines sum to the total.
- `body-systems.json`: the body systems that group the specialty directory's full list (screen 4), bilingual, each listing specialty slugs. Editorial draft for Dr Ayman; the 104-group mapping comes with task 1.5.
- `invites.json`: three claim invites for screen 9 (`/claim/[token]`): `demo-valid` for `doc_013` (unclaimed), `demo-expired` for `doc_014`, `demo-used` for `doc_010` (already claimed, so that profile is pending). Any other token is forged. Real invites store only a hash of the token and expire 14 days after sending (task 2.3); the valid demo expires far ahead so the prototype link keeps working. Emails use the reserved `example.com` domain.
- `profiles.json`: one row per doctor with what the profile page (screens 6 and 7) shows beyond the card: group practice and the registry source and date for unclaimed and pending rows; the named board, licence state and the next open times (UTC) for verified rows. `slotsUtc[0]` equals the doctor's `nextAvailableUtc`; doc_001 and doc_007 have none.
- `introductions.json`: five inbox rows for `doc_002` (screen 32, `/professional/inbox`): `int_001` and `int_002` confirmed and upcoming (int_002 with shared summary `sh_001`, not yet reviewed), `int_003` a new introduction request with the concern and age group from the intake, `int_004` a visit yesterday not yet marked done (shared summary `sh_002`, reviewed), `int_005` done. Times are authored for 3 to 12 Nov 2026 and shifted with `sampleInstant`, so the upcoming visits stay ahead. Join links use the reserved `example.com` domain.
