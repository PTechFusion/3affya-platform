# 24. Records upload

**Area:** Patient · **Purpose:** Upload files, get a quote · **Build:** M3 · **Task:** 3.7 · **In prototype (23 Oct):** Yes

**Notes:** Nothing processes before payment

## States to design

- Dropzone
- validating
- rejected files listed
- quote
- consent
- paying

## Data shown

Files, accepted size, pages, quote in 1 GB blocks (USD 9.99 each), consent checkbox

## Layout call (phone first)

Dropzone with a camera button first on phone. Below it the file list with per-file status. Then the quote box (files, pages, total). Then the two consent checkboxes (privacy, AI processing with the where-stored line) and Pay. Above the fold: dropzone and file list. Hook: the quote updates as files land.

## Pointers

- Separate AI-processing consent checkbox with a where your data is stored line; UAE residency to be settled (Q3). `[T3 Q3]`
- Phone photos first (camera button), formats and size visible, per-file success or specific rejection reason. `[T10 F8 L4]`
- Quote shown as one all-in number before consent; nothing processes before payment (as planned). `[C5 P1]`

## Rules referenced

- **C5** (research) Show the all-in consultation price on the card and profile before Book; never a base price with fees added at checkout. _Evidence: Drip pricing lowered trust and rebooking intent (n=1,000); 21% abandon when total cost is not visible early; 59% say price before care is critical._ Source: ACM/OECD drip pricing; Baymard; AccessOne survey <https://oecd-opsi.org/bi-projects/full-price-information-for-consumers-what-effect-does-the-way-prices-are-displayed-have-on-online-booking-behaviour-for-holiday-homes/>
- **F8** (research) Right keyboard per field (email, tel, numeric); autocorrect and autocapitalise off on names, emails and codes; inputs rendered at 16 px or larger to stop iOS zoom. _Evidence: 54% of sites fail keyboard types; iOS Safari auto-zooms inputs under 16 px._ Source: Baymard Touch Keyboards; Strahl iOS auto-zoom <https://baymard.com/research-articles/mobile-touch-keyboards>
- **L4** (research) Errors: exact problem next to the element, the fix, input preserved, no blame, no humour, no codes by default. _Evidence: NN/g error-message guidelines; WCAG 3.3.1._ Source: NN/g Error-Message Guidelines <https://www.nngroup.com/articles/error-message-guidelines/>
- **P1** (research) Full price and what it includes shown before the final step; the three lines (doctor fee, platform fee, card processing) sum to the total; nothing new at review. _Evidence: 40% abandon for extra costs; 12% because total was not visible up front; average cart abandonment 70%._ Source: Baymard Cart Abandonment; Order Review <https://baymard.com/lists/cart-abandonment-rate>
- **Q3** (law) UAE health data may not be stored, processed or transferred outside the UAE without health-authority approval (Federal Law 2 of 2019, Art. 13; fines AED 500k to 700k; 25-year retention). Plan data residency or an approval route before UAE launch. _Evidence: Al Tamimi; Clifford Chance 2025._ Source: Al Tamimi, UAE ICT Health Law <https://tamimi.com/law-update-articles/the-federal-law-regulating-the-use-of-information-and-communication-technology-in-the-uae-healthcare-sector>
- **T3** (research) Separate, explicit consent before any uploaded record is processed by AI, distinct from the privacy consent; say where data is stored and processed. _Evidence: 46% want permission asked before AI is used on their records, 38% notification (n=3,000, Jan 2026); UAE law restricts health data leaving the country._ Source: Univ. of Michigan AI consent survey; UAE ICT Health Law <https://medresearch.umich.edu/research-news/ai-healthcare-notification-and-consent-preferences-based-us-national-survey>
- **T10** (research) Upload designed for phone photos of paper reports first; accepted formats, size limit and per-file success state visible. _Evidence: Portal upload adoption is slow when friction is high (53 uploaders in four years at one practice)._ Source: Applied Clinical Informatics 2019 <https://vivo.weill.cornell.edu/display/pubid30970383>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
