# 45. AI jobs and costs

**Area:** Admin · **Purpose:** Watch the records pipeline · **Build:** M3 · **Task:** 3.11 · **In prototype (23 Oct):** Yes

**Notes:** Daily spend alert

## States to design

- Table
- failed job retry
- daily spend

## Data shown

Jobs, tokens, cost, status, retry

## Layout call (phone first)

Daily spend tile row at the top (today, this week, alert threshold), then the jobs table with status and Retry; LTR numerals in charts.

## Pointers

- Charts with LTR numerals; empty state explains what a job is. `[R11 L3]`

## Rules referenced

- **L3** (research) Every empty state says what the container is, why it is empty, and gives one direct action; never show No records while content is still loading. _Evidence: NN/g empty-state guidelines._ Source: NN/g, Designing Empty States <https://www.nngroup.com/articles/empty-state-interface-design/>
- **R11** (research) Charts: numerals LTR, axis order mirrored by hand; do not trust library defaults. _Evidence: 11 Arabic-speaking practitioners: RTL support in chart tools is fragmented._ Source: Alebri et al. 2026 <https://arxiv.org/abs/2607.24571>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
