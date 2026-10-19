# 22. Bookings list

**Area:** Patient · **Purpose:** See past and upcoming visits · **Build:** M3 · **Task:** 3.6 · **In prototype (23 Oct):** Yes

## States to design

- List
- empty

## Data shown

Status (upcoming, done, cancelled, refunded), doctor, time

## Layout call (phone first)

Tabs Upcoming and Past. Each row: doctor photo, date and time in the patient zone, status chip, Join or View. Empty state with Find a doctor. Above the fold: next visit as a larger card, then the list.

## Pointers

- Empty state: what it is, why empty, Find a doctor action; view is the primary action. `[L3 T1]`
- Times in the patient zone; cancel uses outcome-named buttons (Cancel booking / Keep booking). `[P6 B10]`

## Rules referenced

- **B10** (research) Prefer undo over confirmation for routine actions; confirmation dialogs only for irreversible actions, buttons that name the outcome (Cancel booking / Keep booking). _Evidence: Frequent confirmations train click-through._ Source: NN/g Confirmation Dialogs <https://www.nngroup.com/articles/confirmation-dialog/>
- **L3** (research) Every empty state says what the container is, why it is empty, and gives one direct action; never show No records while content is still loading. _Evidence: NN/g empty-state guidelines._ Source: NN/g, Designing Empty States <https://www.nngroup.com/articles/empty-state-interface-design/>
- **P6** (guideline) Every slot in the patient's local time with the zone named (3:00 PM Riyadh, GMT+3), doctor's time secondary; store UTC; recompute each render because the Gulf has no DST and the US does. _Evidence: Saudi, Kuwait, Qatar, Bahrain UTC+3; UAE, Oman UTC+4; no DST in the Gulf._ Source: timedate.org Middle East zones; HHS <https://timedate.org/time-zones/middle-east>
- **T1** (guideline) View and download are the two primary portal actions; phone-first layout. _Evidence: 90% of portal users view results, 70% notes, 32% download; 51% use an app; 57% of adults use a portal._ Source: ONC Data Brief 69 (2022) <https://healthit.gov/data/data-briefs/individuals-access-and-use-patient-portals-and-smartphone-health-apps-2022>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
