# 46. Outreach and invites

**Area:** Admin · **Purpose:** Track invite tokens · **Build:** M2 · **Task:** 2.3, 4.5 · **In prototype (23 Oct):** Yes

**Notes:** Sending waits on counsel

## States to design

- Table
- filters

## Data shown

Invites sent, opened, claimed, expired

## Layout call (phone first)

Funnel tiles (sent, opened, claimed, expired) then the table with filters; send actions stay disabled until counsel clears sending.

## Pointers

- Track opened and claimed; filters one level down. `[U6 A5]`

## Rules referenced

- **A5** (research) Admin tables: progressive disclosure, rarely used options one level down, frequency logged. _Evidence: NN/g progressive disclosure._ Source: NN/g Progressive Disclosure <https://www.nngroup.com/articles/progressive-disclosure/>
- **U6** (research) Warn and prepare: claiming invites scrutiny; set up alerts and reply tooling at claim time (for when reviews ship). _Evidence: After owners claimed Yelp pages, average rating fell over 10% for more than a year._ Source: FIU / Information Systems Research 2026 <https://business.fiu.edu/news/2026/claiming-your-business-page-on-review-platforms-can-have-unintended-effects-on-customer-reviews-study-shows.html>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
