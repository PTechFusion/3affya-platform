# 32. Introduction inbox

**Area:** Professional · **Purpose:** See bookings and requests · **Build:** M2 (placeholder), M3 (real) · **Task:** 2.9, 3.3 · **In prototype (23 Oct):** Yes

## States to design

- Empty
- list
- detail with shared summary link

## Data shown

Booking time, patient first name, video link, shared summary; requests are `introduction_requests` rows (20 Oct 2026): requested time, visit type, concern, status (open, booked, declined, withdrawn), and the booking once paid

## Layout call (phone first)

Rows: patient first name, date and time in the doctor zone, status, Join. Detail drawer: both times, join link, shared summary link with expiry. Above the fold: next visit large, then the list.

## Pointers

- Empty state explains when requests appear; detail answers what, when (both zones), how to join. `[L3 E2]`
- Shared summary link shows expiry and that the patient can revoke. `[T7]`

## Rules referenced

- **E2** (research) Answer every likely question in the body (what, when in both zones, how to join, how to change, what to prepare); no ads; works on a small screen. _Evidence: Users annoyed by emails that require extra work or carry sales pitches._ Source: NN/g, State of Transactional Email <https://www.nngroup.com/articles/state-transactional-email/>
- **L3** (research) Every empty state says what the container is, why it is empty, and gives one direct action; never show No records while content is still loading. _Evidence: NN/g empty-state guidelines._ Source: NN/g, Designing Empty States <https://www.nngroup.com/articles/empty-state-interface-design/>
- **T7** (research) Who can see this panel on every record and share; share expiry visible; revoke in one tap. _Evidence: Over 12% withheld information from providers over privacy fears; only about 25% very confident in record privacy._ Source: JMIR privacy survey via Becker's <https://www.beckershospitalreview.com/healthcare-information-technology/patient-perception-of-health-record-privacy-security-6-findings/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
