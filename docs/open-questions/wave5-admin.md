# Wave 5 (admin, screens 37 to 47): open questions for Dr Ayman and counsel

Deduplicated from the ten screen reports. Nothing here blocks the prototype; each has a placeholder in config/business.ts or copy.

## Counsel
1. Outreach (46): cold-emailing doctors from the NPI registry. CAN-SPAM opt-out and postal address, Resend acceptable-use policy, NPPES terms. Send stays disabled until cleared.
2. Audit log (47): retention period and whether a CSV export is allowed at all.
3. Removals (41): record retention after a removal; is a removal restorable?

## Policy (Dr Ayman)
4. Admin accounts (37): who is the account owner that resets TOTP and recovery codes, and who enrols new admins. Confirm 5 refusals → 30 min pause, email code valid 10 min. Notify the owner on a pause?
5. Credential review (38): is there a final, non-resubmittable rejection (sanctions, identity)? Review SLA (48 h placeholder). Reviewer notes in both languages? A checked list of state-board lookup URLs.
6. Suspension (39): what happens to upcoming paid visits (keep, or cancel and refund)? Is the doctor emailed the reason? Re-verification: licence expiry or yearly, 30-day due-soon window; overdue → hide badge or suspend? May admin edit a verified doctor's specialty or Arabic name?
7. Specialties (40): hiding removes from directory and search but profiles stay (confirm). Who maintains body systems. Taxonomy codes and search words are drafts pending the NUCC check (task 1.5). Fixed slug vs rename with redirects.
8. Removals (41): pause the 48 h clock while waiting on the doctor? Which checks must pass before removal? Amber warning at 36 h?
9. Members (42): complimentary months tool (1, 2, 3 months via trial_end)? Grace extension of 7 days per click without Stripe, with a cap? Should pending claimed doctors appear? Should screen 33 show "Free until"?
10. Payments (43): 3affya pays the card fee on every refund; should the doctor return the platform fee on doctor-cancel (Q8)? Partial refunds? Admin refund of a future visit also cancels it once Stripe confirms (confirm). Goodwill refunds above the rule: one admin's note or an approval? Negative Stripe balance after a transfer reversal carried by 3affya?
11. AI jobs (45): per-GB price vs per-page AI cost (sample job_007: 450 pages cost 113 % of its USD 9.99 block). Per-page ceiling, per-page pricing or a lower cap? Daily alert threshold and inbox. Charge timing: screens 25/45 say taken when the summary is ready vs P13 capture in full.
12. Outreach (46): default invite language (English now). 14-day link, 300-char personal line, From and reply address. Record the address source for audit?
13. Audit (47): patient first names in the log or ids only (ids now, 47.3)?

## Arabic terms to confirm
- 41: برتقاليًا; مُفعَّل / غير مُفعَّل
- 47: قيد (entry), المنفِّذ (actor), ملف طبيب (listing target)
