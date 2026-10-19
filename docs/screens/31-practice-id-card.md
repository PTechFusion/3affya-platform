# 31. Practice ID card

**Area:** Professional · **Purpose:** View and download the card · **Build:** M2 · **Task:** 2.7 · **In prototype (23 Oct):** Yes

**Notes:** Same DoctorCard component rendered to PNG

## States to design

- Front
- back
- unverified watermark

## Data shown

Card PNG in both languages

## Layout call (phone first)

Card shown large, flip button, language toggle, Download PNG for each side. Unverified watermark until approved. Above the fold: the card.

## Pointers

- Verification tick and logo never mirrored; Arabic +2 pt, letter-spacing 0, real weights. `[R2 R6 R5]`
- Badge text: Credentials verified on [date]; unverified watermark until approved. `[C8 A2]`

## Rules referenced

- **A2** (practitioner) Verified expires: schedule re-verification (licence at expiry, board per cycle) and show verified on [date] to patients. _Evidence: NCQA recredentialing every 2 to 3 years; Stanford visible recency._ Source: Verifiable on NCQA; Stanford <https://credibility.stanford.edu/guidelines>
- **C8** (research) Verification badge with a plain-language label (Credentials verified, with date), never an icon alone; name the board and link to the public verifier. _Evidence: Verified-buyer badge raised purchase odds 15%; 56% of consumers do not know if their doctor is certified._ Source: Spiegel Research Center; ABMS survey <https://spiegel.medill.northwestern.edu/How-Online-Reviews-Influence-Sales>
- **R2** (guideline) Mirror: back and next, chevrons, steppers, progress bars (0% on the right), pagination, carousels, text-alignment icons. Do not mirror: media controls, clocks, search magnifier, pencil, checkmarks, logos, card-scheme marks, photos. _Evidence: Apple HIG, Material m1, Wikimedia Codex, Microsoft mirroring guidance agree._ Source: Apple HIG RTL; Material m1 Bidirectionality; Codex <https://m1.material.io/usability/bidirectionality.html>
- **R5** (research) Arabic body 16 px floor on mobile, 18 px preferred; about +2 pt when Arabic sits beside uppercase Latin; line height 1.5 or more. _Evidence: Apple +2 pt; over 60% of 73 Saudi sites set paragraphs at 12 to 16 px, judged too small; Arabic extenders need extra leading (W3C alreq)._ Source: Apple HIG; Namoun & Alkhodre 2019; W3C alreq <https://thesai.org/Downloads/Volume10No4/Paper_72-Towards_Usability_Guidelines_for_the_Design_of_Effective_Arabic_Websites.pdf>
- **R6** (guideline) letter-spacing: 0 on [lang=ar]; font-synthesis: none; real Readex Pro weights; no italics for Arabic (emphasise with weight or colour); no text-align: justify. _Evidence: Spacing joined letters creates undesirable results (W3C alreq); browsers lack kashida justification; obliques make letters look alike._ Source: W3C alreq; thoughtbot obliques <https://www.w3.org/TR/alreq/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
