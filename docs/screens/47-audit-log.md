# 47. Audit log

**Area:** Admin · **Purpose:** Who did what · **Build:** M2 · **Task:** 2.8 · **In prototype (23 Oct):** Yes

**Notes:** Append only

## States to design

- Table with filters

## Data shown

Actor, action, target, old, new, time

## Layout call (phone first)

Table with actor, action, target, old and new (expandable), time; filters by actor and action; no edit controls anywhere.

## Pointers

- Actor, source and reviewer on verification events; append only. `[A1 B10]`

## Rules referenced

- **A1** (practitioner) Verify licence, board certification and sanctions against primary sources (state board, ABMS, FSMB/NPDB) before Verified shows; store source, date and reviewer. _Evidence: NCQA primary-source verification elements._ Source: Verifiable on NCQA PSV <https://verifiable.com/blog/ncqa-primary-source-verification-requirements>
- **B10** (research) Prefer undo over confirmation for routine actions; confirmation dialogs only for irreversible actions, buttons that name the outcome (Cancel booking / Keep booking). _Evidence: Frequent confirmations train click-through._ Source: NN/g Confirmation Dialogs <https://www.nngroup.com/articles/confirmation-dialog/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
