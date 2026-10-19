# 5. Search results

**Area:** Public · **Purpose:** Find a doctor by filters · **Build:** M2 · **Task:** 2.1 · **In prototype (23 Oct):** Yes

**Notes:** Verified only, featured first, 20 per page

## States to design

- Results
- empty
- loading skeleton

## Data shown

Filters: specialty, language, location, visit type, age group; DoctorCard list; pagination

## Layout call (phone first)

Sticky top bar: query, Filters button with count, sort. Applied-filter chips row. One doctor per row: photo left (right in RTL), name and specialty, languages, next available, all-in price, Book. Load more after 20 on phone. Desktop: filters in a left column, list right. Above the fold: first two rows. Hook: next available slot on every row.

## Pointers

- One doctor per row, same attribute set in the same order; key data at the reading-start corner. `[S14 C1 C2 R9]`
- Replace pagination with Load more (15 to 30 mobile, 25 to 75 desktop); filter state in the URL; restore scroll on Back. `[S5 S3]`
- Default sort Relevance, verified above unclaimed; any paid placement carries a Sponsored label on the card itself. `[S4 U3 A4]`
- Add gender, price and next-available-72h to the filters; counts per option; mobile bottom sheet with Show N doctors; applied chips with Clear all; truncate long lists at 6 to 10. `[S7 S8 S9 S10 S11 S12 S13]`
- Autocomplete capped at 10/8; transliteration and typo tolerance; symptom words map to specialties. `[S1 S2]`
- Zero results: relaxed scope, 3 to 5 alternatives, popular doctors, WhatsApp/contact; skeleton shaped like rows. `[S6 L1 L3]`

## Rules referenced

- **A4** (law) Label every paid placement Sponsored or Paid placement at the reading-start corner of each card, with shading or a border; never Featured by or a logo alone; disclose if tier affects ranking. _Evidence: FTC native advertising guide and 2013 search-engine letter._ Source: FTC Native Advertising Guide <https://www.ftc.gov/business-guidance/resources/native-advertising-guide-businesses>
- **C1** (research) Every card shows the same attributes in the same order: photo, name, specialty, languages, visit types, next available, all-in price, verification state; say unknown rather than leave a gap. _Evidence: 64% of sites show attributes inconsistently; testers rejected items missing an attribute their neighbours had._ Source: Baymard, List Item Design <https://baymard.com/research-articles/list-item-design-ecommerce>
- **C2** (research) Visually separate each attribute (own line or style); whole card clickable, secondary actions behind a divider; key content at the reading-start corner. _Evidence: 40% of sites jumble attributes; unscannable info hurt almost as much as none._ Source: Baymard List Item Design; NN/g Cards <https://www.nngroup.com/articles/cards-component/>
- **L1** (research) Response limits: under 1 s no indicator; 1 to 10 s a content-shaped skeleton (onset after about 1 s) or a module spinner; over 10 s a progress bar with estimate and cancel. _Evidence: Nielsen's three limits; frame-only skeletons make users think the page is broken._ Source: NN/g Response Times; Skeleton Screens 101 <https://www.nngroup.com/articles/response-times-3-important-limits/>
- **L3** (research) Every empty state says what the container is, why it is empty, and gives one direct action; never show No records while content is still loading. _Evidence: NN/g empty-state guidelines._ Source: NN/g, Designing Empty States <https://www.nngroup.com/articles/empty-state-interface-design/>
- **R9** (research) In Arabic, the reading-start corner is top-right: CTA, doctor name, price and next slot go there (flipped F). _Evidence: RTL readers follow a flipped F pattern; KSU eyetracking: Arabic users scanned results right to left, attention on the top two._ Source: NN/g F-Pattern; Al-Rashed 2010 KSU <https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/>
- **S1** (research) Autocomplete: at most 10 suggestions on desktop, 4 to 8 on mobile; bold the predicted part; arrow keys copy the suggestion into the field. _Evidence: 80% of sites offer autocomplete, 19% do it well; 58% fail arrow-key copy._ Source: Baymard, Autocomplete Design <https://baymard.com/research-articles/autocomplete-design>
- **S2** (research) Tolerate misspellings and Arabic-to-English transliterations (specialties, names) in autocomplete and results; test symptom words like rash. _Evidence: 69% of sites fail misspellings; 90% of hospital finders failed the word rash and matched surnames instead._ Source: Baymard misspellings; Kyruus via Becker's <https://baymard.com/research-articles/offer-autocomplete-suggestions-for-misspellings>
- **S3** (research) Visible search field with a submit button on mobile; persist the query in the field and the filter state in the URL so Back and sharing work. _Evidence: 21% lack a mobile submit button; 37% do not persist queries; 90% of load-more sites break Back._ Source: Baymard search benchmark; Baymard/Smashing load-more study <https://baymard.com/research-articles/mobile-search-submit-button>
- **S4** (research) Default sort is diversity-weighted Relevance; never alphabetical or raw popularity. Offer Relevance, Soonest available, Price, Experience. _Evidence: 24% of sites fail the default sort; unrepresentative first pages made users leave; no tester ever chose alphabetical._ Source: Baymard, Default Sort Type; Essential Sort Types <https://baymard.com/research-articles/default-sort-type>
- **S5** (research) Use Load more, not pagination or infinite scroll: 15 to 30 results on mobile, 25 to 75 on desktop before the button; restore scroll position on Back. _Evidence: Infinite scroll hid the footer and made users skim; pagination made users browse less; load more performed best._ Source: Baymard via Smashing, Pagination vs Infinite Scroll vs Load More <https://www.smashingmagazine.com/2016/03/pagination-infinite-scrolling-load-more-buttons/>
- **S6** (research) Zero results must offer: relaxed-filter parent scope, 3 to 5 alternative queries with previews (auto-applied if only one works), popular doctors, and a human contact. _Evidence: About half of no-results pages raise abandonment; spelling tips alone are not enough._ Source: Baymard, No Results Page <https://baymard.com/research-articles/no-results-page>
- **S7** (research) Offer a filter for every attribute shown on the card; include price, language, visit type, gender, next available within 72 h. _Evidence: 38% of sites lack filters for displayed attributes; 80% of mobile testers tried a price filter; half of new Zocdoc patients book within 72 h._ Source: Baymard, Filters for List Item Info; 5 Essential Filters; Zocdoc <https://baymard.com/research-articles/have-filters-for-list-item-info>
- **S8** (research) Doctor gender is a first-class filter, suggested for ob/gyn, urology, psychiatry and dermatology. _Evidence: Riyadh survey (n=3,015): women favoured female physicians for gynaecology, obstetrics, urology and counselling; men preferred male for urology, surgery, orthopaedics._ Source: J Nat Sci Med 2019 <https://doaj.org/article/e3139a066bae43858880c1712e6cd4cc>
- **S9** (research) Multi-select within a filter type (OR), AND across types; checkboxes not radios; 5 to 10 filter types visible. _Evidence: Testers commonly applied 5 to 6 filters, up to 10; 15% of sites block combining values._ Source: Baymard, Multiple Filter Values <https://baymard.com/research-articles/allow-applying-of-multiple-filter-values>
- **S10** (research) Show result counts beside every filter option and on the mobile Apply button (Show 37 doctors); never let a combination land on an empty list. _Evidence: Counts are one of the highest-impact improvements; they let users avoid zero-result combinations._ Source: Baymard filter UI; NN/g Applying Filters <https://www.nngroup.com/articles/applying-filters/>
- **S11** (research) Desktop: apply filters instantly (under 1 s, dim the list, keep scroll). Mobile: batch behind a sticky Apply in a bottom sheet; sticky filter trigger; top three filters first. _Evidence: Four page loads for four filters is too costly on mobile; only 2 to 10% of mobile users open filters vs 38% on desktop._ Source: NN/g Applying Filters; Baymard guideline 1125; Contentsquare <https://baymard.com/guidelines/1125-apply-buttons-in-mobile-filtering-interfaces>
- **S12** (research) Always show applied filters as removable chips with Clear all; never only a count like Filters (3). _Evidence: 28% of sites lack the overview; count-only overviews performed poorly._ Source: Baymard, How to Design Applied Filters <https://baymard.com/blog/how-to-design-applied-filters>
- **S13** (research) Truncate long value lists at 6 to 10 visible values with a Show more (+N) link; never truncate a single value. _Evidence: Under 6 values users assumed the list was complete; 15+ lost overview; inline scroll areas fail on 26% of sites._ Source: Baymard, Truncation Design <https://baymard.com/research-articles/truncation-design>
- **S14** (research) List layout (one doctor per row), not a grid of cards, for search results. _Evidence: Cards de-emphasise ranking and are harder to scan; lists suit homogeneous, comparable items._ Source: NN/g Cards; Baymard product tables <https://www.nngroup.com/articles/cards-component/>
- **U3** (practitioner) Rank unclaimed profiles below verified ones so the first page is bookable; give them a Request this doctor path if shown at all. _Evidence: Zeros (searches with no match) are the liquidity failure to minimise; seeded supply is a bridge, not the product._ Source: a16z network effects; Lenny's Newsletter <https://a16z.com/16-ways-to-measure-network-effects/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
