# 12. For professionals

**Area:** Public · **Purpose:** Explain membership and claim flow · **Build:** M2 · **Task:** 1.6 · **In prototype (23 Oct):** Yes

**Notes:** Prices placeholder until 7 Nov

## States to design

- Default

## Data shown

Membership tiers (prices from Q8), banner add-on, how claiming works

## Layout call (phone first)

Hero line for doctors, then the practice card shown large as the reward, then three steps (claim, verify, go live), then a three-column tier table (stacked on phone, middle tier highlighted), then FAQ for doctors. Above the fold: hero and card. Hook: Find your profile search box in the hero.

## Pointers

- Three tiers, at most four differing attributes, all-in price and billing period, static comparison table (prices placeholder until 7 Nov). `[B8 C5]`
- Sell on numbers: live availability (half of new patients book within 72 h), photo (2x views); show the practice card as the reward. `[B9 B4]`
- How claiming works: free, from your registry profile, only verifiable fields required; note that patients will scrutinise a claimed profile. `[U5 U6 B2]`

## Rules referenced

- **B2** (research) Required fields are only what admin will verify (NPI, licence, board, specialty, photo); everything else is complete later. _Evidence: Practices spend about USD 2.76B a year updating directory data; 40%+ never correct their listings._ Source: AHA on CAQH; Healthgrades <https://www.aha.org/node/402650>
- **B4** (research) Live preview card that renders exactly as the public card; show the benefit at the step (photos get about 2x views). _Evidence: NN/g heuristics 1 and 6; Doximity 500k-profile analysis._ Source: NN/g 10 Heuristics; Doximity <https://www.nngroup.com/articles/ten-usability-heuristics/>
- **B8** (research) Membership page: three tiers, at most four attributes differing between adjacent tiers, features carry upward, all-in price and billing period up front, static comparison table. _Evidence: Good-Better-Best (HBR 2018); NN/g comparison tables; drip pricing harms trust._ Source: HBR Good-Better-Best; NN/g Comparison Tables <https://www.nngroup.com/articles/comparison-tables/>
- **B9** (practitioner) Sell membership on patient-side outcomes with numbers: live availability (half of new patients book within 72 h), photos (2x views), fast response. _Evidence: Zocdoc patient access data; Doximity._ Source: Zocdoc patient access <https://www.zocdoc.com/about/patientaccess/>
- **C5** (research) Show the all-in consultation price on the card and profile before Book; never a base price with fees added at checkout. _Evidence: Drip pricing lowered trust and rebooking intent (n=1,000); 21% abandon when total cost is not visible early; 59% say price before care is critical._ Source: ACM/OECD drip pricing; Baymard; AccessOne survey <https://oecd-opsi.org/bi-projects/full-price-information-for-consumers-what-effect-does-the-way-prices-are-displayed-have-on-online-booking-behaviour-for-holiday-homes/>
- **U5** (practitioner) Claim flow: free, show the already-built profile and what the doctor can edit, verify by NPI plus email OTP, promise you can always edit this. _Evidence: Zocdoc and Yelp claim patterns; Doximity starts registration from an NPI stub._ Source: Zocdoc claim; Doximity registration <https://support.doximity.com/hc/en-us/articles/360047630573-How-to-Register-on-Doximity>
- **U6** (research) Warn and prepare: claiming invites scrutiny; set up alerts and reply tooling at claim time (for when reviews ship). _Evidence: After owners claimed Yelp pages, average rating fell over 10% for more than a year._ Source: FIU / Information Systems Research 2026 <https://business.fiu.edu/news/2026/claiming-your-business-page-on-review-platforms-can-have-unintended-effects-on-customer-reviews-study-shows.html>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
