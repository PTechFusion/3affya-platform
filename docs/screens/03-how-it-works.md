# 3. How it works

**Area:** Public · **Purpose:** Patient journey in 3 steps · **Build:** M2 · **Task:** 1.6 · **In prototype (23 Oct):** Yes

## States to design

- Default

## Data shown

Steps, fees explained, visit types

## Layout call (phone first)

Three numbered steps as stacked cards (find, book, talk), each with one line and a small illustration; fees box under step 2; visit types under step 3; what to prepare as an accordion; CTA to search at the end and sticky on phone. Above the fold: step 1 and 2. Hook: fee example with the three lines filled in.

## Pointers

- Three steps, two levels of detail at most, recommended path highlighted; make clear no account is needed to browse. `[X5 X6 F9]`
- Explain fees as one all-in number plus what it includes; cancellation terms here too; video vs phone with a best-for line. `[C5 P5 C12]`
- What to prepare for a visit (device test, private room, ID) and the not-for-emergencies line. `[H14 P10]`

## Rules referenced

- **C5** (research) Show the all-in consultation price on the card and profile before Book; never a base price with fees added at checkout. _Evidence: Drip pricing lowered trust and rebooking intent (n=1,000); 21% abandon when total cost is not visible early; 59% say price before care is critical._ Source: ACM/OECD drip pricing; Baymard; AccessOne survey <https://oecd-opsi.org/bi-projects/full-price-information-for-consumers-what-effect-does-the-way-prices-are-displayed-have-on-online-booking-behaviour-for-holiday-homes/>
- **C12** (research) Visit type (video or phone) is an explicit choice with a one-line best-for hint; do not default everyone to video. Note: Saudi rules may require video (Q1). _Evidence: Patients trusted phone more than video for confidentiality (72.5% vs 59.8%); phone was the top format for 46.5% (n=567)._ Source: JMIR Human Factors 2023 <https://humanfactors.jmir.org/2023//e50740/>
- **F9** (research) No login wall for browsing; ask for sign-in only at the commitment point (booking, upload). _Evidence: Login walls are among the most annoying patterns; delayed sign-up gave Duolingo +20% DAU; 24% abandoned carts over forced accounts._ Source: NN/g Login Walls; Baymard Guest Checkout <https://www.nngroup.com/articles/login-walls/>
- **H14** (guideline) Show a not-for-emergencies line with the local emergency number for the viewer's country. _Evidence: DHA excludes emergencies from telehealth; HHS: 911 only works in the patient's location._ Source: Kayrouz UAE telehealth; HHS emergency plan <https://telehealth.hhs.gov/providers/preparing-patients-for-telehealth/creating-an-emergency-plan>
- **P5** (practitioner) Cancellation and refund policy visible on the checkout step itself, not only in terms. _Evidence: Stanford: avoid surprises; common gap on telehealth sites._ Source: Stanford guidelines; Sesame pattern <https://credibility.stanford.edu/guidelines>
- **P10** (guideline) Confirmation is the peak and the end: both times, join link, add to calendar, what to prepare (device test, private room, ID), expected lead time, how to change. _Evidence: Peak-end rule; AMA pre-visit checklist (camera, mic, ~384 kbps, private well-lit room, ID)._ Source: Laws of UX Peak-End; AMA Telehealth Playbook <https://www.ama-assn.org/system/files/2020-10/telehealth-implementation-playbook-appendix-i3.pdf>
- **X5** (research) Progressive disclosure, two levels at most: core steps first, details behind a labelled control; accordions for many short items, tabs for a few long ones. _Evidence: Designs beyond two levels usually have low usability._ Source: NN/g Progressive Disclosure; Tabs vs Accordions <https://www.nngroup.com/articles/progressive-disclosure/>
- **X6** (practitioner) Keep the steps list short and highlight the recommended path. _Evidence: Hick-Hyman law: decision time rises with number and complexity of choices._ Source: Laws of UX, Hick's Law <https://lawsofux.com/hicks-law/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
