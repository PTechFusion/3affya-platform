# 38. Credential review queue

**Area:** Admin · **Purpose:** Approve or reject claims · **Build:** M2 · **Task:** 2.8 · **In prototype (23 Oct):** Yes

**Notes:** Approve sets verified plus date

## States to design

- Queue
- detail with documents
- approved
- rejected with reason

## Data shown

Claim, uploads, registry data, decision, reason

## Layout call (phone first)

Left: queue list with age and status. Right: detail with the registry data and the doctor's entries side by side, documents as thumbnails opening in a viewer, a verification checklist (licence, board, sanctions, photo) each with source and date fields, then Approve or Reject with reason. Above the fold: the checklist.

## Pointers

- Checklist per claim: licence (state board), board (ABMS), sanctions (FSMB/NPDB); store source, date, reviewer; board eligible never becomes the badge. `[A1 A2 B7]`
- Photo check (white coat, no stock); approve/reject with outcome-named buttons; reject requires a reason the doctor sees. `[C4 B10]`

## Rules referenced

- **A1** (practitioner) Verify licence, board certification and sanctions against primary sources (state board, ABMS, FSMB/NPDB) before Verified shows; store source, date and reviewer. _Evidence: NCQA primary-source verification elements._ Source: Verifiable on NCQA PSV <https://verifiable.com/blog/ncqa-primary-source-verification-requirements>
- **A2** (practitioner) Verified expires: schedule re-verification (licence at expiry, board per cycle) and show verified on [date] to patients. _Evidence: NCQA recredentialing every 2 to 3 years; Stanford visible recency._ Source: Verifiable on NCQA; Stanford <https://credibility.stanford.edu/guidelines>
- **B7** (research) Board eligible is a distinct text label, never the badge; reject board certified claims without a named ABMS/AOA board. _Evidence: 78% of consumers conflate licensure with certification; FTC treats unsubstantiated claims as deceptive._ Source: ABMS survey; FTC <https://www.abderm.org/media/40431/abms-2010-consumer-survey.pdf>
- **B10** (research) Prefer undo over confirmation for routine actions; confirmation dialogs only for irreversible actions, buttons that name the outcome (Cancel booking / Keep booking). _Evidence: Frequent confirmations train click-through._ Source: NN/g Confirmation Dialogs <https://www.nngroup.com/articles/confirmation-dialog/>
- **C4** (research) Photo guidance: formal attire with white coat (scrubs plus coat for surgical and ER), plain background, no group or stock photos; a smile is optional. _Evidence: 4,062-patient study: white coat rated highest (8.1/10); no significant trust difference between smiling and neutral (n=268)._ Source: Petrilli BMJ Open 2018; Univ. Augsburg smile study <https://bmjopen.bmj.com/content/8/5/e021239>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
