# Arabic strings: review status

All Arabic strings in `ar.json` were AI-drafted on 19 Oct 2026 from the content document and the approved theme board. Every key is **needs_review** until Dr Ayman corrects it in the deployed preview.

Keys reviewed and approved go into `ar.reviewed.json` as a flat list of dot-paths. `npm run i18n:check` reports how many keys are still unreviewed.

Rules for Arabic copy (from docs/screen-rules.md, group R and G):
- Neutral respectful register (أهلاً بك), no scripted religious phrases in system copy.
- Western digits in both locales; the formatter in `lib/format.ts` forces `nu-latn`.
- Specialty names Arabic first, English in parentheses where the English term is the one patients know.
- Never letter-space, never italicise, never justify Arabic.

## Glossary pairs for Dr Ayman (wave 4)
- Booking status, patient side (feminine, agrees with زيارة): مؤكدة / مكتملة / ملغاة / تم الاسترداد. Inbox (professional side) says مؤكد for a طلب/موعد. Confirm one pair.
- "ملغاة" on the visit box vs "مسترد" on the receipt: the first is the visit, the second the money. Both appear for the same booking.
