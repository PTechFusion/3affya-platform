# Sample data

Synthetic, for the prototype only. Never put a real patient document or a real NPI record here; real registry data arrives through `scripts/` in task 1.5 and real patient data never leaves production.

- `doctors.json`: 20 doctors, 8 verified, 4 pending, 8 unclaimed. Field names match the planned schema (task 1.4).
- `specialties.json`: 24 of the 104 specialty groups, bilingual, with sample counts. The full list comes from the content document in task 1.5.
- `bookings.json`: three bookings in the three money states the patient portal shows. Amounts in minor units; the three lines sum to the total.
- `profiles.json`: one row per doctor with what the profile page (screens 6 and 7) shows beyond the card: group practice and the registry source and date for unclaimed and pending rows; the named board, licence state and the next open times (UTC) for verified rows. `slotsUtc[0]` equals the doctor's `nextAvailableUtc`; doc_001 and doc_007 have none.
