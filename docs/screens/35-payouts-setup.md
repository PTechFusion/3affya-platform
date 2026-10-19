# 35. Payouts setup

**Area:** Professional · **Purpose:** Connect Stripe Express · **Build:** M3 · **Task:** 3.1 · **In prototype (23 Oct):** Yes

**Notes:** Book button hidden until enabled

## States to design

- Not started
- in progress
- enabled
- restricted

## Data shown

Stripe onboarding link, charges and payouts enabled flags

## Layout call (phone first)

One card: the doctor's practice card small, a sentence on how payouts work, three-step status list (identity, bank, enabled), the Stripe button. Restricted state lists what Stripe needs. Above the fold: everything.

## Pointers

- Show the claimed card and expected earnings before the Stripe link; state the steps and that they can resume. `[B5 B3 F3]`
- Restricted state names what Stripe needs. `[L3]`

## Rules referenced

- **B3** (research) Endowed progress: start the checklist partly filled from registry data and show steps remaining. _Evidence: 12-stamp card with 2 free stamps completed in median 10 days vs 15; Zeigarnik effect._ Source: Kivetz et al. via Columbia Business School <https://business.columbia.edu/insights/chazen-global-insights/goal-gradient-hypothesis-resurrected-purchase-acceleration>
- **B5** (research) Deliver value before asking for effort: show the claimed card and benefits before Stripe onboarding. _Evidence: Fogg B=MAP; reciprocity._ Source: Fogg Behavior Model; Growth.Design psychology <https://behaviormodel.org/>
- **F3** (research) Group long forms into chunks of 4 to 6 fields with headings; show all steps with the current one highlighted; allow back and save-and-resume. _Evidence: 15-field form regrouped into three chunks (NN/g); wizard guidelines; users want to know steps remaining._ Source: NN/g Form White Space; NN/g Wizards <https://www.nngroup.com/articles/wizards/>
- **L3** (research) Every empty state says what the container is, why it is empty, and gives one direct action; never show No records while content is still loading. _Evidence: NN/g empty-state guidelines._ Source: NN/g, Designing Empty States <https://www.nngroup.com/articles/empty-state-interface-design/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
