# 23. Receipts

**Area:** Patient · **Purpose:** Itemised receipts · **Build:** M3 · **Task:** 3.6 · **In prototype (23 Oct):** Yes

## States to design

- List
- detail
- refund line

## Data shown

Lines, totals, refund entries

## Layout call (phone first)

List of rows (date, doctor, total, status). Detail: total large, the three lines, refund entries below, download PDF. Above the fold: the list.

## Pointers

- Total prominent, three lines, last 4 digits, both times, refund entries; written estimate retained; local currency. `[E3 P15 P14]`

## Rules referenced

- **E3** (research) Receipt mirrors the review step: total most prominent, the three lines, last 4 digits, both times, change and cancel links. _Evidence: Baymard order-review information list._ Source: Baymard, Office Depot Order Review <https://baymard.com/research-articles/office-depot-order-review-experience>
- **P14** (guideline) Price in the patient's currency (SAR, AED, QAR, KWD, OMR, BHD); KWD, OMR and BHD use three decimals, round to the nearest 10 fils (verify Stripe rounding). _Evidence: Local currency improves conversion and authorisation rates (Stripe)._ Source: Stripe currencies <https://docs.stripe.com/currencies>
- **P15** (law) Keep a Good Faith Estimate style breakdown in the portal after payment. _Evidence: US No Surprises Act: self-pay patients get a written estimate when scheduling 3+ business days ahead._ Source: CMS, Understanding costs in advance <https://www.cms.gov/nosurprises/consumers/understanding-costs-in-advance>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
