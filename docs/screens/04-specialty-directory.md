# 4. Specialty directory

**Area:** Public · **Purpose:** Browse 104 groups · **Build:** M2 · **Task:** 2.1 · **In prototype (23 Oct):** Yes

**Notes:** Counts show verified only

## States to design

- Default
- empty group

## Data shown

104 groups, Arabic and English names, doctor counts

## Layout call (phone first)

Six curated specialties as large tiles, then See all 104 expands an alphabetical two-column list grouped by body system, Arabic first with English small. Count badge on each. Above the fold: the six tiles and the search box. Hook: tiles show one doctor photo each.

## Pointers

- Curated top specialties first with see all 104; names Arabic first with English in parentheses. `[X7 S16]`
- Counts per group (verified only); hide groups with zero bookable doctors from promotion rather than showing 0. `[S10 S17 H6]`
- Grid is fine here (heterogeneous browse); in Arabic the first item is top-right. `[S14 R9]`

## Rules referenced

- **H6** (research) Show counts (doctors, specialties, bookings) only when they are large enough to impress; small numbers backfire. _Evidence: A participant judged an article unpopular because it had only 1,000 shares._ Source: NN/g, Social Proof in the UX <https://www.nngroup.com/articles/social-proof-ux/>
- **R9** (research) In Arabic, the reading-start corner is top-right: CTA, doctor name, price and next slot go there (flipped F). _Evidence: RTL readers follow a flipped F pattern; KSU eyetracking: Arabic users scanned results right to left, attention on the top two._ Source: NN/g F-Pattern; Al-Rashed 2010 KSU <https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/>
- **S10** (research) Show result counts beside every filter option and on the mobile Apply button (Show 37 doctors); never let a combination land on an empty list. _Evidence: Counts are one of the highest-impact improvements; they let users avoid zero-result combinations._ Source: Baymard filter UI; NN/g Applying Filters <https://www.nngroup.com/articles/applying-filters/>
- **S14** (research) List layout (one doctor per row), not a grid of cards, for search results. _Evidence: Cards de-emphasise ranking and are harder to scan; lists suit homogeneous, comparable items._ Source: NN/g Cards; Baymard product tables <https://www.nngroup.com/articles/cards-component/>
- **S16** (research) Specialty names bilingual: Arabic first, English in parentheses; language filter names the dialect. _Evidence: Gulf users code-switch for medical vocabulary; language-concordant care improved outcomes in 25 of 33 studies._ Source: Diamond et al. JGIM 2019; Saudi code-switching studies <https://pubmed.ncbi.nlm.nih.gov/31147980/>
- **S17** (practitioner) Track fill rate and zeros (searches with no bookable doctor) as the north-star; do not promote a specialty x city combination until it has bookable supply. _Evidence: Fill rate is the primary marketplace metric; 80% of marketplaces studied went supply-first; Zillow seeded from public records._ Source: Lenny's Newsletter marketplace metrics; a16z; Andrew Chen <https://www.lennysnewsletter.com/p/the-most-important-marketplace-metrics>
- **X7** (research) Show a curated set first (top specialties, a few doctors) with see-all, not the whole catalogue. _Evidence: Jam study: 6 options converted 30%, 24 options 3%._ Source: Iyengar & Lepper 2000 via Econsultancy <https://econsultancy.com/want-more-sales-give-consumers-fewer-options/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
