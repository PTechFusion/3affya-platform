# 40. Specialty list

**Area:** Admin · **Purpose:** Edit the 104 groups · **Build:** M2 · **Task:** 2.8 · **In prototype (23 Oct):** Yes

## States to design

- Table
- edit

## Data shown

Arabic and English names (the content document's card titles; the 24 prototype slugs kept, 20 Oct 2026), slug, taxonomy codes

## Layout call (phone first)

Table: Arabic name, English name, slug, codes, synonyms; inline edit; Add row at the top.

## Pointers

- Arabic and English names plus synonym and transliteration lists for search. `[S16 S2]`

## Rules referenced

- **S2** (research) Tolerate misspellings and Arabic-to-English transliterations (specialties, names) in autocomplete and results; test symptom words like rash. _Evidence: 69% of sites fail misspellings; 90% of hospital finders failed the word rash and matched surnames instead._ Source: Baymard misspellings; Kyruus via Becker's <https://baymard.com/research-articles/offer-autocomplete-suggestions-for-misspellings>
- **S16** (research) Specialty names bilingual: Arabic first, English in parentheses; language filter names the dialect. _Evidence: Gulf users code-switch for medical vocabulary; language-concordant care improved outcomes in 25 of 33 studies._ Source: Diamond et al. JGIM 2019; Saudi code-switching studies <https://pubmed.ncbi.nlm.nih.gov/31147980/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
