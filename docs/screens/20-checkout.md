# 20. Checkout

**Area:** Patient · **Purpose:** Pay for the first visit · **Build:** M3 · **Task:** 3.2, 3.3 · **In prototype (23 Oct):** Yes

**Notes:** 10 minute hold; lines sum to intent to the cent

## States to design

- Hold timer running
- hold expired
- payment failed
- success

## Data shown

Doctor fee, platform fee, card processing as 3 lines; total; Stripe element

## Layout call (phone first)

Single page, two blocks: Review (doctor, time in both zones, visit type, edit links) and Pay (three lines and total, then the card box with Apple Pay and Google Pay buttons above the card fields). Consent and cancellation checkboxes between the blocks. Hold timer in the sticky header. Confirmation is a separate page. Above the fold: review block and total. Hook: the hold timer.

## Pointers

- Three lines sum to the total, nothing new; Review with edit links, then a distinct Confirmation. `[P1 C5 P2]`
- Card fields in a bordered box with Secured by Stripe; Apple Pay and Google Pay first; expiry MM / YY; capture in full; keep details after an error. `[P3 P4 P12 P13]`
- Cancellation terms and telehealth consent on this step; confidentiality line in plain Arabic. `[P5 P9 T12]`
- Local currency, three decimals for KWD/OMR/BHD, Western digits, currency sign part of the number. `[P14 N2 N1]`
- Backup phone and country; no re-asking of data from the slot picker. `[F10 F2]`
- Hold timer visible; paying state shows steps, never a blank spinner. `[L1 T11]`

## Rules referenced

- **C5** (research) Show the all-in consultation price on the card and profile before Book; never a base price with fees added at checkout. _Evidence: Drip pricing lowered trust and rebooking intent (n=1,000); 21% abandon when total cost is not visible early; 59% say price before care is critical._ Source: ACM/OECD drip pricing; Baymard; AccessOne survey <https://oecd-opsi.org/bi-projects/full-price-information-for-consumers-what-effect-does-the-way-prices-are-displayed-have-on-online-booking-behaviour-for-holiday-homes/>
- **F2** (research) Cut fields to the minimum; one Full name field; hide rarely used fields behind links; never re-ask for data already entered. _Evidence: Average checkout has 11.3 fields, 8 are enough; 42% typed full name into first-name; WCAG 3.3.7 Redundant Entry._ Source: Baymard checkout fields; W3C SC 3.3.7 <https://baymard.com/blog/checkout-flow-average-form-fields>
- **F10** (guideline) Phone input: GCC country codes first, LTR entry, per-country length validation; collect a backup phone and the patient's country at booking. _Evidence: Codex phone rules; HHS: pre-agree who calls whom if the visit disconnects, confirm location each visit._ Source: Wikimedia Codex bidi; HHS emergency plan <https://doc.wikimedia.org/codex/main/style-guide/bidirectionality.html>
- **L1** (research) Response limits: under 1 s no indicator; 1 to 10 s a content-shaped skeleton (onset after about 1 s) or a module spinner; over 10 s a progress bar with estimate and cancel. _Evidence: Nielsen's three limits; frame-only skeletons make users think the page is broken._ Source: NN/g Response Times; Skeleton Screens 101 <https://www.nngroup.com/articles/response-times-3-important-limits/>
- **N1** (guideline) Western digits everywhere, forced in code: Intl.NumberFormat('ar-SA-u-nu-latn') and ar-AE-u-nu-latn; CLDR defaults ar-SA to Arabic-Indic digits. _Evidence: Saudi is singled out as preferring Western numerals, but CLDR's default for ar-SA is native digits._ Source: Wikipedia Eastern Arabic numerals; CLDR-users 2019 <https://corp.unicode.org/pipermail/cldr-users/2019-April/000918.html>
- **N2** (guideline) Numbers run LTR inside Arabic sentences; currency sign is part of the number; percent sign left of the number with no space; eastern separators 1,234.50. _Evidence: W3C alreq 6.1._ Source: W3C alreq <https://www.w3.org/TR/alreq/>
- **P1** (research) Full price and what it includes shown before the final step; the three lines (doctor fee, platform fee, card processing) sum to the total; nothing new at review. _Evidence: 40% abandon for extra costs; 12% because total was not visible up front; average cart abandonment 70%._ Source: Baymard Cart Abandonment; Order Review <https://baymard.com/lists/cart-abandonment-rate>
- **P2** (research) Linear flow: Review step with inline edit links, then a separate Confirmation; review must never look like confirmation. _Evidence: 11.6% mistook review for confirmation; up to 11% abandonment._ Source: Baymard, Office Depot Order Review <https://baymard.com/research-articles/office-depot-order-review-experience>
- **P3** (research) Encapsulate the card fields in a bordered box with one or two security cues inside (lock, Secured by Stripe); 3DS on for all cards. _Evidence: 19% abandoned over card-data distrust (n=1,026); 33% of MENA consumers have been fraud victims; 3DS recommended for all Saudi card payments._ Source: Baymard Perceived Security; Checkout.com mada docs <https://baymard.com/blog/perceived-security-of-payment-form>
- **P4** (research) Expiry as MM / YY with input mask; auto-space the card number; keep card details after an error. _Evidence: 72% mismatch the printed card format; 34% clear card details on error._ Source: Baymard, Expiration Date Fields <https://baymard.com/research-articles/how-to-format-expiration-date-fields>
- **P5** (practitioner) Cancellation and refund policy visible on the checkout step itself, not only in terms. _Evidence: Stanford: avoid surprises; common gap on telehealth sites._ Source: Stanford guidelines; Sesame pattern <https://credibility.stanford.edu/guidelines>
- **P9** (guideline) Telehealth informed consent inside the booking flow, before the first visit, recorded with how and when it was given. _Evidence: HHS: consent is typically done before the first appointment and documented._ Source: HHS, Obtaining informed consent <https://telehealth.hhs.gov/providers/preparing-patients-for-telehealth/obtaining-informed-consent>
- **P12** (guideline) Accept Visa, Mastercard, Apple Pay and Google Pay and say so up front; expect mada-only debit cards to fail on a non-Saudi Stripe account; Apple Pay is the main Saudi path. _Evidence: Stripe UAE/US accounts do not take mada; outside Saudi acquiring, mada cards behave as debit cards; wallets plus mada dominate Saudi e-commerce._ Source: Stripe UAE methods; Checkout.com mada; SAMA <https://www.checkout.com/docs/payments/payment-methods/mada>
- **P13** (guideline) Capture in full at booking (no auth-then-capture); refunds not voids. _Evidence: mada transactions must be captured in full; partial capture and auth-only unsupported._ Source: Checkout.com mada docs <https://www.checkout.com/docs/payments/payment-methods/mada>
- **P14** (guideline) Price in the patient's currency (SAR, AED, QAR, KWD, OMR, BHD); KWD, OMR and BHD use three decimals, round to the nearest 10 fils (verify Stripe rounding). _Evidence: Local currency improves conversion and authorisation rates (Stripe)._ Source: Stripe currencies <https://docs.stripe.com/currencies>
- **T11** (research) Show the work during processing: a live step list (Reading page 3 of 12, Extracting diagnoses, Writing summary); no fake percentage; over 10 s show an estimate and a cancel. _Evidence: Labour illusion: users preferred a slower site that showed its work; 86% of users preferred a progress bar; never let a bar move backwards._ Source: Buell & Norton 2011; UX Tigers progress indicators <https://www.uxtigers.com/post/progress-indicators>
- **T12** (research) Confidentiality statement in plain Arabic at booking and in the consult lobby; never push health details through marketing channels. _Evidence: Worry about online monitoring rose from 34% to 44% across seven Arab countries (n=7,303)._ Source: NU-Q Media Use 2019 <https://www.qatar.northwestern.edu/news/articles/2019/12-media-use-survey-2019.html>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
