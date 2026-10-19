# 10. This is me / remove me

**Area:** Public · **Purpose:** Doctor asks for removal or claims · **Build:** M2 · **Task:** 2.2, 2.8 · **In prototype (23 Oct):** Yes

**Notes:** 48 hour admin SLA

## States to design

- Form
- submitted

## Data shown

Name, NPI, email, reason

## Layout call (phone first)

Short centred form: two radio choices (This is me, Remove me) that change the copy, then name, NPI, email, reason. Submitted state: what happens and the 48-hour promise. Above the fold: the whole form. Hook: none needed; keep it under one screen.

## Pointers

- Four fields, labels above, specific errors; NPI field LTR numeric. `[F1 F2 F5]`
- Submitted state names the 48-hour SLA and what happens next (410 within 48 hours). `[U4 A3]`

## Rules referenced

- **A3** (research) Queue removal requests and (later) 1-star reviews for human moderation with evidence rules; providers can never delete reviews. _Evidence: A single 1-star review was followed by a 2.3 to 2.6% drop in new-patient volume for 16+ weeks (1.12M appointments)._ Source: AJMC 2023; Zocdoc moderation <https://www.ajmc.com/view/the-impact-of-1-star-physician-ratings-on-new-patient-volume>
- **F1** (research) Labels above fields, never placeholder-only; single column; mark optional fields, not required. _Evidence: Placeholders strain memory and are skipped by screen readers; users ignored asterisks (eyetracking)._ Source: NN/g Placeholders; cxpartners eyetracking <https://www.nngroup.com/articles/form-design-placeholders/>
- **F2** (research) Cut fields to the minimum; one Full name field; hide rarely used fields behind links; never re-ask for data already entered. _Evidence: Average checkout has 11.3 fields, 8 are enough; 42% typed full name into first-name; WCAG 3.3.7 Redundant Entry._ Source: Baymard checkout fields; W3C SC 3.3.7 <https://baymard.com/blog/checkout-flow-average-form-fields>
- **F5** (research) Adaptive error messages that name the specific sub-rule and the fix, next to the field, in text (not colour alone); never the word invalid. _Evidence: 98% of sites use generic errors; some users took 5 minutes or gave up; WCAG 3.3.1._ Source: Baymard Adaptive Errors; NN/g Error Messages; W3C SC 3.3.1 <https://baymard.com/blog/adaptive-validation-error-messages>
- **U4** (practitioner) Prominent Are you Dr X? Claim this profile, free, plus a visible This is not me / remove link. _Evidence: Zocdoc claim page pattern: preview, editable sections, free, benefits, removal link._ Source: Zocdoc claim page <https://www.zocdoc.com/claim/su-ho-ap>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
