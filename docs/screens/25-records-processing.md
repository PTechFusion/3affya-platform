# 25. Records processing

**Area:** Patient · **Purpose:** Show progress · **Build:** M3 · **Task:** 3.8 · **In prototype (23 Oct):** Yes

**Notes:** Standing rule: never a blank wait

## States to design

- Queued
- per page progress
- failed with reason
- done

## Data shown

File list, pages done of total, cost so far

## Layout call (phone first)

One card: overall status line, then a step list with the current step live (page 4 of 12), cost so far, estimate, Cancel. Below: what you will get, as three lines. Above the fold: everything. Hook: the step list moving.

## Pointers

- Live step list with page counts and cost so far; estimate and cancel when over 10 s; no fake percentage. `[T11 L1]`
- Failed state names the reason and the fix (re-upload page 4). `[L3 L4]`

## Rules referenced

- **L1** (research) Response limits: under 1 s no indicator; 1 to 10 s a content-shaped skeleton (onset after about 1 s) or a module spinner; over 10 s a progress bar with estimate and cancel. _Evidence: Nielsen's three limits; frame-only skeletons make users think the page is broken._ Source: NN/g Response Times; Skeleton Screens 101 <https://www.nngroup.com/articles/response-times-3-important-limits/>
- **L3** (research) Every empty state says what the container is, why it is empty, and gives one direct action; never show No records while content is still loading. _Evidence: NN/g empty-state guidelines._ Source: NN/g, Designing Empty States <https://www.nngroup.com/articles/empty-state-interface-design/>
- **L4** (research) Errors: exact problem next to the element, the fix, input preserved, no blame, no humour, no codes by default. _Evidence: NN/g error-message guidelines; WCAG 3.3.1._ Source: NN/g Error-Message Guidelines <https://www.nngroup.com/articles/error-message-guidelines/>
- **T11** (research) Show the work during processing: a live step list (Reading page 3 of 12, Extracting diagnoses, Writing summary); no fake percentage; over 10 s show an estimate and a cancel. _Evidence: Labour illusion: users preferred a slower site that showed its work; 86% of users preferred a progress bar; never let a bar move backwards._ Source: Buell & Norton 2011; UX Tigers progress indicators <https://www.uxtigers.com/post/progress-indicators>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
