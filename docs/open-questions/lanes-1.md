# Lanes L1 to L5 (23 Oct 2026): questions for Yasir, Dr Ayman and counsel

Collected from the five lane reports and the wave review. Nothing here blocks the next lanes; each has a default in the code.

## Yasir (decisions)
1. L1: should every client write that carries a business number (holds, shares, audit rows, intake transcript) go through
   RPCs only, retiring the direct INSERT grants? (Review's recommendation: yes; L6 brief says so.)
2. L1: is exposing `professionals.user_id` and `reviewed_by` on anonymous directory reads acceptable, or does the public read
   go through a column-restricted view first? (Recommendation: the view, with L6.)
3. L2: confirm the webhook's reclaim and 409 behaviour (CLAUDE.md now states it) over the literal "200 and stop".
4. L2: "stripe trigger twice" creates two events and two rows; the check is one row per event id plus a second delivery.
   Confirm that reading of task 1.8.
5. L2: `handled_at` is a timestamp; the amount stays in the stored payload. Add a queryable amount column?
6. L2: stripe@23.0.0 (API 2026-09-30) chosen as the launch version; no further major upgrades.
7. L3: model choice after the spike. At about 6,500 tokens a page, Opus 5.5 is about USD 0.06 a page, so USD 9.99 per GB
   covers about 170 pages per GB at cost; Sonnet 5.5 half, Haiku 5.5 a fortieth.
8. L3: refusal fallbacks (server-side `fallbacks` beta) stay off; a refusal is a logged, non-retried failure. Confirm.
9. L3: DOCX enters as PDF pages; the converter for production (LibreOffice headless in the worker, or a service).
10. L3: per-instance circuit and token counter; does task 3.8 want a fleet-wide (database) breaker and cap?
11. L3: should invalid model output count toward the shared circuit at all?
12. L4: sender `3affya <hello@mail.3affya.com>`, replies to `hello@3affya.com`. Confirm the local part.
13. L4: booking confirmation is sent from an Inngest step the webhook enqueues, not inside the webhook request. Decide
    before task 3.3.
14. L4: pin `tsx` as a devDependency for `scripts/*.ts`?
15. L5: the RLS suite in CI on every PR (3 to 4 minutes) or nightly?
16. L5: one unit for file sizes (credentials show binary MB, records SI MB).
17. L5: `/intake` as a full page (task 3.12) or dropped from the route map?
18. L0: create the Stripe Dashboard webhook endpoint with API version 2026-09-30.endive, subscribed only to handled event
    types; a 409 in endpoint health is expected during an in-flight attempt.

## Dr Ayman
19. L3 (with Yasir): the per-page AI cost versus the USD 9.99 per GB price (question 7).
20. L3: BAA scope: are structured outputs covered? Off by default; the schema is in the prompt and zod validates either way.
21. L4: the claim-received email promises "our answer by <submitted + 48 h>" from the review SLA placeholder. Confirm the
    SLA, or drop the promise from the email.
22. L4: 145 Arabic email strings are `needs_review`; the hosted prototype shows every template at `/ar/emails/<template>`
    behind the basic-auth gate, so they can be reviewed in place.
23. L1: body systems for the 80 new specialty groups (the seed leaves them null); decides how screen 4 groups them.

## Counsel
24. L2: retention of webhook payloads (they carry Stripe's customer details such as receipt email and billing details), and
    whether a deleted patient's events are redacted like the other payment lines.
25. L4: the doctor's booking email leaves the patient's reason for the visit out (first name, age group and times only).
    Confirm that posture.
26. L1: the patient-deletion scrub keeps `patient_country` and the concern on bookings, and `card_brand` and `card_last4` on
    receipts. Confirm those do not count as identifying under the retention position.
27. L3: data residency: pin inference to the US (`inference_geo`) to match the records policy? Not sent today.
