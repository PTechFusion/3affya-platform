# 27. Sharing and consent

**Area:** Patient · **Purpose:** Share with one doctor · **Build:** M3 · **Task:** 3.10 · **In prototype (23 Oct):** Yes

**Notes:** Default 30 days until Q13

## States to design

- No shares
- shared (expiry)
- revoked

## Data shown

Chosen professional, expiry date, revoke

## Layout call (phone first)

List of shares as rows (doctor, expires on, Revoke). Share with a doctor button opens a sheet listing booked doctors and an expiry picker. Who can see this panel pinned at the top. Above the fold: panel and first share.

## Pointers

- Who can see this panel, expiry visible, revoke in one tap; plain confidentiality line. `[T7 T12]`
- No shares: explain what sharing does and offer Share with your booked doctor. `[L3]`

## Rules referenced

- **L3** (research) Every empty state says what the container is, why it is empty, and gives one direct action; never show No records while content is still loading. _Evidence: NN/g empty-state guidelines._ Source: NN/g, Designing Empty States <https://www.nngroup.com/articles/empty-state-interface-design/>
- **T7** (research) Who can see this panel on every record and share; share expiry visible; revoke in one tap. _Evidence: Over 12% withheld information from providers over privacy fears; only about 25% very confident in record privacy._ Source: JMIR privacy survey via Becker's <https://www.beckershospitalreview.com/healthcare-information-technology/patient-perception-of-health-record-privacy-security-6-findings/>
- **T12** (research) Confidentiality statement in plain Arabic at booking and in the consult lobby; never push health details through marketing channels. _Evidence: Worry about online monitoring rose from 34% to 44% across seven Arab countries (n=7,303)._ Source: NU-Q Media Use 2019 <https://www.qatar.northwestern.edu/news/articles/2019/12-media-use-survey-2019.html>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
