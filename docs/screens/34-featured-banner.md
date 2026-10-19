# 34. Featured banner

**Area:** Professional · **Purpose:** Buy the carousel slot · **Build:** January · **Task:** 3.5 · **In prototype (23 Oct):** No

**Notes:** Carousel moved to January

## States to design

- Hidden until carousel ships

## Data shown

Price, status

## Layout call (phone first)

Hidden until January. When shown: price, dates picker, preview of the home carousel slot with the Sponsored label visible in the preview.

## Pointers

- Any purchased slot renders with a Sponsored label at the reading-start corner, shaded; same attributes as organic cards. `[A4]`

## Rules referenced

- **A4** (law) Label every paid placement Sponsored or Paid placement at the reading-start corner of each card, with shading or a border; never Featured by or a logo alone; disclose if tier affects ranking. _Evidence: FTC native advertising guide and 2013 search-engine letter._ Source: FTC Native Advertising Guide <https://www.ftc.gov/business-guidance/resources/native-advertising-guide-businesses>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
