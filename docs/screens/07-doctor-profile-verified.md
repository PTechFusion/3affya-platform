# 7. Doctor profile: verified

**Area:** Public · **Purpose:** Book a first visit · **Build:** M2 · **Task:** 2.2 · **In prototype (23 Oct):** Yes

**Notes:** Book button needs Stripe Connect enabled (M3)

## States to design

- Default
- no availability
- payouts not ready (book hidden)

## Data shown

Card front and back data, bio, training, languages, fees, visit types, ages, tags, availability preview, verified date, Book

## Layout call (phone first)

Card front as the header (photo, names, specialty, city, verified badge with date). Then fee and next three slots with a sticky Book bar on phone. Then credentials and training, languages and visit types, bio, availability preview. Desktop: card and booking box pinned right, content left. Above the fold: card, fee, next slots. Hook: tap the card to flip to the back.

## Pointers

- Block order: card, credentials (board named, verified on date, link to verifier), fees and visit types, availability, bio. Define board certified on first use. `[C9 C8 H8 X3]`
- All-in price and next available above the fold; sticky Book on mobile; Accepting new patients state. `[C5 C6 C10]`
- No reviews at launch: show years in practice and training as the trust signal and a New to 3affya label; no scarcity tricks. `[C7 C11]`
- Video vs phone with a best-for line (see Q1 for Saudi); cancellation terms near Book; English bio stays left-aligned inside the Arabic page. `[C12 P5 R4]`

## Rules referenced

- **C5** (research) Show the all-in consultation price on the card and profile before Book; never a base price with fees added at checkout. _Evidence: Drip pricing lowered trust and rebooking intent (n=1,000); 21% abandon when total cost is not visible early; 59% say price before care is critical._ Source: ACM/OECD drip pricing; Baymard; AccessOne survey <https://oecd-opsi.org/bi-projects/full-price-information-for-consumers-what-effect-does-the-way-prices-are-displayed-have-on-online-booking-behaviour-for-holiday-homes/>
- **C6** (practitioner) Show next available slot and Accepting new patients on the card, live from the calendar. _Evidence: One-third of consumers only view doctors accepting new patients; live availability lifted web booking conversion 30% (self-reported)._ Source: Healthgrades; Zocdoc case study <https://www.zocdoc.com/resources/case-studies/next-level-urgent-care-increased-booking-conversion/>
- **C7** (research) Show years in practice and training as the trust signal while there are no reviews; label New to 3affya instead of empty stars. _Evidence: 61% preferred a 4-star physician with 20+ years over a 5-star with four; hide star averages under 5 ratings; 55% would still consider a provider with no reviews._ Source: Healthgrades; Baymard ratings; Repugen 2024 <https://baymard.com/research-articles/user-ratings-distribution-summary>
- **C8** (research) Verification badge with a plain-language label (Credentials verified, with date), never an icon alone; name the board and link to the public verifier. _Evidence: Verified-buyer badge raised purchase odds 15%; 56% of consumers do not know if their doctor is certified._ Source: Spiegel Research Center; ABMS survey <https://spiegel.medill.northwestern.edu/How-Online-Reviews-Influence-Sales>
- **C9** (practitioner) Order profile blocks: card data, credentials and training, fees and visit types, availability, bio; education is the second most-weighed factor after reviews. _Evidence: Healthgrades consumer data._ Source: Healthgrades provider profiles <https://ucmscdn.healthgrades.com/d6/24/00b66c3f4fa9941593d888fae713/best-practices-for-curating-provider-profiles.pdf>
- **C10** (research) Keep the Book CTA visible without scrolling on mobile (sticky). _Evidence: Place-order and key options must sit in the first mobile viewport; users do not scroll far enough._ Source: Baymard, Order Review; Guest Checkout <https://baymard.com/research-articles/make-guest-checkout-prominent>
- **C11** (research) Only authentic scarcity (a real next slot); no countdowns, no only-2-left, no strikethrough prices without a stated basis. _Evidence: 11.1% of 11k sites had dark patterns; urgency tactics trigger reactance and damage trust._ Source: Mathur et al. 2019; Growth.Design GoDaddy case <https://arxiv.org/pdf/1907.07032>
- **C12** (research) Visit type (video or phone) is an explicit choice with a one-line best-for hint; do not default everyone to video. Note: Saudi rules may require video (Q1). _Evidence: Patients trusted phone more than video for confidentiality (72.5% vs 59.8%); phone was the top format for 46.5% (n=567)._ Source: JMIR Human Factors 2023 <https://humanfactors.jmir.org/2023//e50740/>
- **H8** (research) Define US board certified in one plain sentence wherever the badge first appears. _Evidence: Only 23% of consumers could define board certification; 78% wrongly think it is required to practise; 91% rate it important once defined._ Source: ABMS 2010 Consumer Survey <https://www.abderm.org/media/40431/abms-2010-consumer-survey.pdf>
- **P5** (practitioner) Cancellation and refund policy visible on the checkout step itself, not only in terms. _Evidence: Stanford: avoid surprises; common gap on telehealth sites._ Source: Stanford guidelines; Sesame pattern <https://credibility.stanford.edu/guidelines>
- **R4** (guideline) Align 3+ line paragraphs by their own language (English bio inside an Arabic page stays left-aligned); 1 to 2 line labels follow the page direction; list items share one alignment even when some are Latin. _Evidence: Apple HIG RTL._ Source: Apple HIG, Right to left <https://developer.apple.com/design/human-interface-guidelines/right-to-left>
- **X3** (research) Make every credential claim verifiable: link to the certifying board or licence registry. _Evidence: Stanford guideline 1: easy third-party verification raises credibility; ABMS Certification Matters is the public lookup._ Source: Stanford guidelines; ABMS Certification Matters <https://www.certificationmatters.org/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
