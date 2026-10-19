# 43. Payments, refunds, payouts

**Area:** Admin · **Purpose:** Money view and refund action · **Build:** M3 · **Task:** 3.4, 3.11 · **In prototype (23 Oct):** Yes

**Notes:** Refund reverses transfer

## States to design

- Tables
- refund confirm

## Data shown

Payments, refunds, payouts from Stripe, CSV export

## Layout call (phone first)

Three tabs. Payments table with status; Refund button opens a drawer with the amount, the transfer reversal note, and a confirm that names the outcome. Export CSV top right.

## Pointers

- Refund (not void) with outcome-named confirmation; export mirrors receipt lines. `[P13 B10 E3]`

## Rules referenced

- **B10** (research) Prefer undo over confirmation for routine actions; confirmation dialogs only for irreversible actions, buttons that name the outcome (Cancel booking / Keep booking). _Evidence: Frequent confirmations train click-through._ Source: NN/g Confirmation Dialogs <https://www.nngroup.com/articles/confirmation-dialog/>
- **E3** (research) Receipt mirrors the review step: total most prominent, the three lines, last 4 digits, both times, change and cancel links. _Evidence: Baymard order-review information list._ Source: Baymard, Office Depot Order Review <https://baymard.com/research-articles/office-depot-order-review-experience>
- **P13** (guideline) Capture in full at booking (no auth-then-capture); refunds not voids. _Evidence: mada transactions must be captured in full; partial capture and auth-only unsupported._ Source: Checkout.com mada docs <https://www.checkout.com/docs/payments/payment-methods/mada>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
