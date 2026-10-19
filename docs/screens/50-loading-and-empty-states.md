# 50. Loading and empty states

**Area:** Supporting · **Purpose:** Every route · **Build:** M1 onward · **Task:** 1.6, 1.7 · **In prototype (23 Oct):** Yes

**Notes:** Standing rule: never a blank wait; every page has a hook

## States to design

- Skeleton with real labels
- empty with next action

## Data shown

Per screen

## Layout call (phone first)

Skeletons are shaped like the real rows and cards and use real labels; empty states are a short title, one line of why, one button; both live on the brand page and are reused, never redrawn per screen.

## Pointers

- Nielsen limits (1 s, 10 s), 400 ms optimistic response, three-part empty states, labour-illusion step lists, specific errors. `[L1 L2 L3 L4 T11]`

## Rules referenced

- **L1** (research) Response limits: under 1 s no indicator; 1 to 10 s a content-shaped skeleton (onset after about 1 s) or a module spinner; over 10 s a progress bar with estimate and cancel. _Evidence: Nielsen's three limits; frame-only skeletons make users think the page is broken._ Source: NN/g Response Times; Skeleton Screens 101 <https://www.nngroup.com/articles/response-times-3-important-limits/>
- **L2** (practitioner) Respond to every tap within 400 ms with at least an optimistic change (filters, slot holds, chat). _Evidence: Doherty threshold (IBM 1982)._ Source: Laws of UX, Doherty Threshold <https://lawsofux.com/doherty-threshold/>
- **L3** (research) Every empty state says what the container is, why it is empty, and gives one direct action; never show No records while content is still loading. _Evidence: NN/g empty-state guidelines._ Source: NN/g, Designing Empty States <https://www.nngroup.com/articles/empty-state-interface-design/>
- **L4** (research) Errors: exact problem next to the element, the fix, input preserved, no blame, no humour, no codes by default. _Evidence: NN/g error-message guidelines; WCAG 3.3.1._ Source: NN/g Error-Message Guidelines <https://www.nngroup.com/articles/error-message-guidelines/>
- **T11** (research) Show the work during processing: a live step list (Reading page 3 of 12, Extracting diagnoses, Writing summary); no fake percentage; over 10 s show an estimate and a cancel. _Evidence: Labour illusion: users preferred a slower site that showed its work; 86% of users preferred a progress bar; never let a bar move backwards._ Source: Buell & Norton 2011; UX Tigers progress indicators <https://www.uxtigers.com/post/progress-indicators>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
