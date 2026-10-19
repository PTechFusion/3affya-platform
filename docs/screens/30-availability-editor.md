# 30. Availability editor

**Area:** Professional · **Purpose:** Weekly rules, exceptions, timezone · **Build:** M2 · **Task:** 2.6 · **In prototype (23 Oct):** Yes

## States to design

- Default
- exception added
- preview as Riyadh viewer

## Data shown

Weekly rules, date exceptions, slot length, IANA timezone

## Layout call (phone first)

Weekly grid (seven columns, swipeable on phone) with tap-to-add rules, exceptions list below, slot length and timezone selectors above. Preview as Riyadh viewer toggle shows the patient's view. Above the fold: the week grid. Hook: the preview toggle.

## Pointers

- Weekend shading follows the preview country; Riyadh preview shows zone and no-DST note; Gregorian. `[P7 P6 N3]`
- Changes apply within 400 ms with undo, no confirmation dialogs. `[L2 B10]`
- Saving the first rule flips Accepting new patients on, with a one-line notice. `[B6]`

## Rules referenced

- **B6** (practitioner) Structured fields, not free text: years in practice, board and status, training, languages with dialect, Accepting new patients (default off until availability is set). _Evidence: NCQA primary-source verification needs board, licence and training as separate items; one-third of patients filter on accepting._ Source: Verifiable on NCQA; Healthgrades <https://verifiable.com/blog/ncqa-primary-source-verification-requirements>
- **B10** (research) Prefer undo over confirmation for routine actions; confirmation dialogs only for irreversible actions, buttons that name the outcome (Cancel booking / Keep booking). _Evidence: Frequent confirmations train click-through._ Source: NN/g Confirmation Dialogs <https://www.nngroup.com/articles/confirmation-dialog/>
- **L2** (practitioner) Respond to every tap within 400 ms with at least an optimistic change (filters, slot holds, chat). _Evidence: Doherty threshold (IBM 1982)._ Source: Laws of UX, Doherty Threshold <https://lawsofux.com/doherty-threshold/>
- **N3** (guideline) Gregorian as the primary calendar; Hijri optional secondary (useful around Ramadan and Eid). _Evidence: Saudi Cabinet approved Gregorian for official dealings (31 Oct 2023); banks already used it._ Source: Gulf News; Arab News 2023 <https://gulfnews.com/world/gulf/saudi/saudi-arabia-adopts-gregorian-calendar-use-in-official-dealings-1.99118179>
- **P6** (guideline) Every slot in the patient's local time with the zone named (3:00 PM Riyadh, GMT+3), doctor's time secondary; store UTC; recompute each render because the Gulf has no DST and the US does. _Evidence: Saudi, Kuwait, Qatar, Bahrain UTC+3; UAE, Oman UTC+4; no DST in the Gulf._ Source: timedate.org Middle East zones; HHS <https://timedate.org/time-zones/middle-east>
- **P7** (guideline) Shade weekends per country: Fri-Sat for Saudi, Kuwait, Qatar, Oman, Bahrain; Sat-Sun for UAE (since 2022); never hard-code Sat-Sun. _Evidence: UAE moved to Saturday-Sunday on 1 Jan 2022; the rest keep Sunday-Thursday weeks._ Source: Executive Traveller; Wikipedia Workweek <https://www.executivetraveller.com/news/uae-switches-weekend-to-saturday-sunday>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
