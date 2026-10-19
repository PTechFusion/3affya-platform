# 39. Listings

**Area:** Admin · **Purpose:** Manage professionals · **Build:** M2 · **Task:** 2.8 · **In prototype (23 Oct):** Yes

## States to design

- Table with status filter
- edit

## Data shown

Status (unclaimed, claimed, verified, rejected, removed), specialty, city

## Layout call (phone first)

Table with status filter chips above (Unclaimed, Claimed, Verified, Rejected, Removed), columns name, specialty, city, verified on, next re-verification; row click opens an edit drawer.

## Pointers

- Verified-on date and next re-verification column; unclaimed clearly distinct. `[A2 A5 U1]`

## Rules referenced

- **A2** (practitioner) Verified expires: schedule re-verification (licence at expiry, board per cycle) and show verified on [date] to patients. _Evidence: NCQA recredentialing every 2 to 3 years; Stanford visible recency._ Source: Verifiable on NCQA; Stanford <https://credibility.stanford.edu/guidelines>
- **A5** (research) Admin tables: progressive disclosure, rarely used options one level down, frequency logged. _Evidence: NN/g progressive disclosure._ Source: NN/g Progressive Disclosure <https://www.nngroup.com/articles/progressive-disclosure/>
- **U1** (practitioner) Label unclaimed profiles to patients: Unclaimed, details from public US records, not yet confirmed by the doctor, with source and date; never let them look identical to verified profiles. _Evidence: Yelp Unclaimed tag; Google Own this business; Healthgrades auto-profiles carry stale data for years._ Source: Yelp, Google, Healthgrades patterns <https://pinmeto.com/blog/risks-of-not-claiming-gmb-listings>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
