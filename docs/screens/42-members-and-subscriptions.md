# 42. Members and subscriptions

**Area:** Admin · **Purpose:** See memberships · **Build:** M3 · **Task:** 3.5, 3.11 · **In prototype (23 Oct):** Yes

## States to design

- Table

## Data shown

Tier, status, renewal, past due

## Layout call (phone first)

Table defaulting to Active and Past due; filter chips for the rest; Stripe link per row.

## Pointers

- Table defaults to active and past due; the rest one level down. `[A5]`

## Rules referenced

- **A5** (research) Admin tables: progressive disclosure, rarely used options one level down, frequency logged. _Evidence: NN/g progressive disclosure._ Source: NN/g Progressive Disclosure <https://www.nngroup.com/articles/progressive-disclosure/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
