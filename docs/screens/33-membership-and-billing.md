# 33. Membership and billing

**Area:** Professional · **Purpose:** Subscribe and manage · **Build:** M3 · **Task:** 3.5 · **In prototype (23 Oct):** Yes

**Notes:** Stripe hosted checkout and portal

## States to design

- No membership
- active
- past due (grace)
- cancelled

## Data shown

Tier, renewal date, Stripe Customer Portal link

## Layout call (phone first)

Current tier card (name, price, renewal), then Manage billing (Stripe portal), then the tier table for upgrades. Past due shows a gold banner at the top. Above the fold: tier card.

## Pointers

- Tier, all-in price, renewal date; past-due state says the grace period and what stops. `[B8 C5]`
- Cancel via Stripe portal; confirmation names the outcome. `[B10]`

## Rules referenced

- **B8** (research) Membership page: three tiers, at most four attributes differing between adjacent tiers, features carry upward, all-in price and billing period up front, static comparison table. _Evidence: Good-Better-Best (HBR 2018); NN/g comparison tables; drip pricing harms trust._ Source: HBR Good-Better-Best; NN/g Comparison Tables <https://www.nngroup.com/articles/comparison-tables/>
- **B10** (research) Prefer undo over confirmation for routine actions; confirmation dialogs only for irreversible actions, buttons that name the outcome (Cancel booking / Keep booking). _Evidence: Frequent confirmations train click-through._ Source: NN/g Confirmation Dialogs <https://www.nngroup.com/articles/confirmation-dialog/>
- **C5** (research) Show the all-in consultation price on the card and profile before Book; never a base price with fees added at checkout. _Evidence: Drip pricing lowered trust and rebooking intent (n=1,000); 21% abandon when total cost is not visible early; 59% say price before care is critical._ Source: ACM/OECD drip pricing; Baymard; AccessOne survey <https://oecd-opsi.org/bi-projects/full-price-information-for-consumers-what-effect-does-the-way-prices-are-displayed-have-on-online-booking-behaviour-for-holiday-homes/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
