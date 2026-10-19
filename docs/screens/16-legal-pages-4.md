# 16. Legal pages (4)

**Area:** Public · **Purpose:** Privacy, terms, fees, refunds · **Build:** M4 · **Task:** 1.6, 4.3 · **In prototype (23 Oct):** Yes

**Notes:** One template, four pages, both languages

## States to design

- Default

## Data shown

Legal copy for Dr Ayman's lawyer

## Layout call (phone first)

One template: title, effective date, a four-line plain summary box at the top, then numbered sections with a sticky in-page contents on desktop. Above the fold: the summary box. Hook: the summary box.

## Pointers

- Privacy page doubles as the Notice of Privacy Practices: prominent, plain language, effective date, complaints contact. `[T9 X4]`
- Counsel must settle: cross-border consult framing (Saudi supervision and video rule), UAE data residency, retention and deletion wording. `[Q1 Q2 Q3 Q4 T8]`
- Fees and refunds page: the three lines, capture in full, refund not void, written estimate kept in the portal. `[P5 P15]`

## Rules referenced

- **P5** (practitioner) Cancellation and refund policy visible on the checkout step itself, not only in terms. _Evidence: Stanford: avoid surprises; common gap on telehealth sites._ Source: Stanford guidelines; Sesame pattern <https://credibility.stanford.edu/guidelines>
- **P15** (law) Keep a Good Faith Estimate style breakdown in the portal after payment. _Evidence: US No Surprises Act: self-pay patients get a written estimate when scheduling 3+ business days ahead._ Source: CMS, Understanding costs in advance <https://www.cms.gov/nosurprises/consumers/understanding-costs-in-advance>
- **Q1** (law) Saudi: a practitioner outside the Kingdom may treat a patient inside it only under supervision of a KSA-based practitioner; teleconsultations must include video; the patient signs consent before the session; identity verified. Decide the product framing (second opinion, Saudi partner physician) with counsel. _Evidence: Al Tamimi summary of Saudi telemedicine licensing; MOH telehealth regulations PDF (valid till March 2022, check for successor)._ Source: Al Tamimi KSA telemedicine; Saudi MOH regulations <https://www.tamimi.com/law-update-articles/the-regulation-and-licensing-of-telemedicine-in-saudi-arabia>
- **Q2** (law) UAE: the patient's location sets the regulator; Abu Dhabi allows telecounselling from outside the UAE but telediagnosis only between licensed facilities; DHA Telehealth Standard requires electronic consent before each consultation, Arabic and English interfaces, UAE-based servers, no remote controlled-substance prescribing. _Evidence: Kayrouz & Associates; Al Tamimi UAE; Neelim 2026._ Source: Kayrouz, UAE telehealth licensing and data <https://www.kayrouzandassociates.com/insights/licensing-and-data-rules-for-telehealth-providers-in-the-uae>
- **Q3** (law) UAE health data may not be stored, processed or transferred outside the UAE without health-authority approval (Federal Law 2 of 2019, Art. 13; fines AED 500k to 700k; 25-year retention). Plan data residency or an approval route before UAE launch. _Evidence: Al Tamimi; Clifford Chance 2025._ Source: Al Tamimi, UAE ICT Health Law <https://tamimi.com/law-update-articles/the-federal-law-regulating-the-use-of-information-and-communication-technology-in-the-uae-healthcare-sector>
- **Q4** (law) Saudi PDPL cross-border transfer needs adequacy, standard clauses or a derogation; confirm the health-data position with counsel. _Evidence: Clifford Chance 2025 (does not address health data specifically)._ Source: Clifford Chance, Data transfers UAE and KSA <https://www.cliffordchance.com/insights/resources/blogs/talking-tech/en/articles/2025/03/doing-business-in-the-middle-east--data-transfers-in-the-uae-and-ksa.html>
- **T8** (research) Delete my uploads and Delete my account controls that state what deletion covers and what legal retention keeps. _Evidence: 37% think AI will make record security worse; UAE mandates 25-year retention for provider records._ Source: Pew 2023; Al Tamimi UAE ICT Health Law <https://www.pewresearch.org/science/2023/02/22/60-of-americans-would-be-uncomfortable-with-provider-relying-on-ai-in-their-own-health-care/>
- **T9** (law) Notice of Privacy Practices posted prominently, plain language, effective date, complaints contact; acknowledgment captured at first use. _Evidence: HHS: prominently post the notice on any site about services; deliver with the first electronic service._ Source: HHS, Notice of Privacy Practices <https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/privacy-practices-for-protected-health-information/index.html>
- **X4** (research) Show a last-reviewed date on medical, process, pricing and legal content. _Evidence: Stanford guideline 8: visibly recent content increases credibility._ Source: Stanford Web Credibility Guidelines <https://credibility.stanford.edu/guidelines>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
