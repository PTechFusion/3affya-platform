# 13. FAQ

**Area:** Public · **Purpose:** Common questions · **Build:** M2 · **Task:** 1.6 · **In prototype (23 Oct):** Yes

## States to design

- Default

## Data shown

Q and A from content document

## Layout call (phone first)

Search-within-FAQ field, then grouped accordions (For patients, Fees and refunds, Records and AI, For doctors). Each answer under six lines. Last-reviewed date at the bottom. Above the fold: search field and first group. Hook: the search field.

## Pointers

- Grade-6 answers, accordion, two levels; include How can a US doctor see me? and What this visit cannot do. `[X1 X5 H15]`
- Fees, refunds and how records are processed (AI consent, where stored) answered here too. `[C5 P5 T3]`
- Last-reviewed date. `[X4]`

## Rules referenced

- **C5** (research) Show the all-in consultation price on the card and profile before Book; never a base price with fees added at checkout. _Evidence: Drip pricing lowered trust and rebooking intent (n=1,000); 21% abandon when total cost is not visible early; 59% say price before care is critical._ Source: ACM/OECD drip pricing; Baymard; AccessOne survey <https://oecd-opsi.org/bi-projects/full-price-information-for-consumers-what-effect-does-the-way-prices-are-displayed-have-on-online-booking-behaviour-for-holiday-homes/>
- **H15** (research) Address legality plainly: a short section on how a US doctor can consult a Gulf patient and what the visit can and cannot do. _Evidence: Saudi survey (n=1,024): 60.5% had used telemedicine but only 41.9% felt the legal aspects were clear._ Source: JMIR Formative 2023, Saudi telemedicine <https://formative.jmir.org/2023/1/e46446>
- **P5** (practitioner) Cancellation and refund policy visible on the checkout step itself, not only in terms. _Evidence: Stanford: avoid surprises; common gap on telehealth sites._ Source: Stanford guidelines; Sesame pattern <https://credibility.stanford.edu/guidelines>
- **T3** (research) Separate, explicit consent before any uploaded record is processed by AI, distinct from the privacy consent; say where data is stored and processed. _Evidence: 46% want permission asked before AI is used on their records, 38% notification (n=3,000, Jan 2026); UAE law restricts health data leaving the country._ Source: Univ. of Michigan AI consent survey; UAE ICT Health Law <https://medresearch.umich.edu/research-news/ai-healthcare-notification-and-consent-preferences-based-us-national-survey>
- **X1** (research) Write patient-facing copy at grade 6 reading level; main message in the first paragraph, visible without scrolling. _Evidence: Plain-language rewrite lifted task success 46% to 82% and cut time 22.3 to 9.5 min (n=50); AMA/NIH recommend grade 4 to 6; CDC CCI passing score 90._ Source: NN/g Lower-Literacy; CDC Clear Communication Index <https://www.nngroup.com/articles/writing-for-lower-literacy-users/>
- **X4** (research) Show a last-reviewed date on medical, process, pricing and legal content. _Evidence: Stanford guideline 8: visibly recent content increases credibility._ Source: Stanford Web Credibility Guidelines <https://credibility.stanford.edu/guidelines>
- **X5** (research) Progressive disclosure, two levels at most: core steps first, details behind a labelled control; accordions for many short items, tabs for a few long ones. _Evidence: Designs beyond two levels usually have low usability._ Source: NN/g Progressive Disclosure; Tabs vs Accordions <https://www.nngroup.com/articles/progressive-disclosure/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
