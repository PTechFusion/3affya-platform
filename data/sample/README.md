# Sample data

Synthetic, for the prototype only. Never put a real patient document or a real NPI record here; real registry data arrives through `scripts/` in task 1.5 and real patient data never leaves production.

- `doctors.json`: 20 doctors, 8 verified, 4 pending, 8 unclaimed. Field names match the planned schema (task 1.4).
- `specialties.json`: 24 of the 104 specialty groups, bilingual, with sample counts. The full list comes from the content document in task 1.5.
- `bookings.json`: three bookings in the three money states the patient portal shows. Amounts in minor units; the three lines sum to the total.
- `body-systems.json`: the body systems that group the specialty directory's full list (screen 4), bilingual, each listing specialty slugs. Editorial draft for Dr Ayman; the 104-group mapping comes with task 1.5.
- `invites.json`: three claim invites for screen 9 (`/claim/[token]`): `demo-valid` for `doc_013` (unclaimed), `demo-expired` for `doc_014`, `demo-used` for `doc_010` (already claimed, so that profile is pending). Any other token is forged. Real invites store only a hash of the token and expire 14 days after sending (task 2.3); the valid demo expires far ahead so the prototype link keeps working. Emails use the reserved `example.com` domain.
- `profiles.json`: one row per doctor with what the profile page (screens 6 and 7) shows beyond the card: group practice and the registry source and date for unclaimed and pending rows; the named board, licence state and the next open times (UTC) for verified rows. `slotsUtc[0]` equals the doctor's `nextAvailableUtc`; doc_001 and doc_007 have none.
- `summaries.json`: three synthetic records summaries (`summaries`, one per record set `rs_001`..`rs_003`, bilingual) and the three shares of them with `doc_002` (`shares`), for screens 36 and 26. Every item carries its source pages; `flags` hold missing documents and conflicts, `unreadable` the pages nothing was taken from. Instants shift with `sampleInstant`; document dates do not. Expiry is derived from `shareDefaultDays`; status from `viewedAtUtc` and the summary's `reviewedBy`: `sh_001` new, `sh_002` viewed, `sh_003` reviewed by doc_002.
