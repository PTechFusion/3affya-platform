# Sample data

Synthetic, for the prototype only. Never put a real patient document or a real NPI record here; real registry data arrives through `scripts/` in task 1.5 and real patient data never leaves production.

- `doctors.json`: 20 doctors, 8 verified, 4 pending, 8 unclaimed. Field names match the planned schema (task 1.4).
- `specialties.json`: 24 of the 104 specialty groups, bilingual, with sample counts. The full list comes from the content document in task 1.5.
- `bookings.json`: three bookings in the three money states the patient portal shows. Amounts in minor units; the three lines sum to the total.
- `body-systems.json`: the body systems that group the specialty directory's full list (screen 4), bilingual, each listing specialty slugs. Editorial draft for Dr Ayman; the 104-group mapping comes with task 1.5.
- `invites.json`: three claim invites for screen 9 (`/claim/[token]`): `demo-valid` for `doc_013` (unclaimed), `demo-expired` for `doc_014`, `demo-used` for `doc_010` (already claimed, so that profile is pending). Any other token is forged. Real invites store only a hash of the token and expire 14 days after sending (task 2.3); the valid demo expires far ahead so the prototype link keeps working. Emails use the reserved `example.com` domain.
- `profiles.json`: one row per doctor with what the profile page (screens 6 and 7) shows beyond the card: group practice and the registry source and date for unclaimed and pending rows; the named board, licence state and the next open times (UTC) for verified rows. `slotsUtc[0]` equals the doctor's `nextAvailableUtc`; doc_001 and doc_007 have none.
- `builder.json`: what two doctors entered in the profile builder (screen 29) beyond the registry row: licence state and number, board status, video link and the names and sizes of the uploaded credential files (names only; the prototype never stores a file). `doc_002` is verified; `doc_009` is pending, and its submitted and decided instants and reviewer note feed the builder's submitted and rejected previews. Instants are authored around 9 Nov and shifted by `sampleInstant`.
- `us-states.json`: the 50 states and DC, bilingual, for the builder's city and licence pickers. Arabic names are AI-drafted (`needs_review`).
