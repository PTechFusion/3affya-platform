# 6. Doctor profile: unclaimed

**Area:** Public · **Purpose:** Public registry listing · **Build:** M2 · **Task:** 2.2 · **In prototype (23 Oct):** Yes

**Notes:** No fee, availability, checkout or contact (tested)

## States to design

- Default
- removal pending

## Data shown

Name, specialty, city, medical school, graduation year, group, hospital; registry label; Invite; This is me

## Layout call (phone first)

Grey Unclaimed banner with source and date at the top. Placeholder photo, name, specialty, city. Facts table (school, year, group, hospital). Then a teal panel: Are you Dr X? Claim this profile, free. Then Find a verified doctor in this specialty. Above the fold: banner, name, claim panel. Hook: claim panel shows the finished card they would get.

## Pointers

- Banner: Unclaimed, from public US records (source, date), not confirmed by the doctor. Facts only, no score or stars; neutral specialty placeholder photo. `[U1 U2 C3]`
- Are you Dr X? Claim this profile, free (preview of what they can edit) plus This is not me / remove link. `[U4 U5]`
- No Book, no fee, no availability (as planned); offer Find a verified doctor in this specialty so the patient is not stranded. `[U3 S6]`

## Rules referenced

- **C3** (practitioner) Headshot on every card; missing photo is a blocking profile defect; neutral specialty placeholder for unclaimed, never a broken image. _Evidence: Profiles with photos get 60% more engagement (Healthgrades); about 2x views across 500,000 Doximity profiles._ Source: Healthgrades provider profiles; Doximity 500k profiles <https://blog.doximity.com/articles/doctors-headshots-5-striking-lessons-from-500-000-physician-profiles>
- **S6** (research) Zero results must offer: relaxed-filter parent scope, 3 to 5 alternative queries with previews (auto-applied if only one works), popular doctors, and a human contact. _Evidence: About half of no-results pages raise abandonment; spelling tips alone are not enough._ Source: Baymard, No Results Page <https://baymard.com/research-articles/no-results-page>
- **U1** (practitioner) Label unclaimed profiles to patients: Unclaimed, details from public US records, not yet confirmed by the doctor, with source and date; never let them look identical to verified profiles. _Evidence: Yelp Unclaimed tag; Google Own this business; Healthgrades auto-profiles carry stale data for years._ Source: Yelp, Google, Healthgrades patterns <https://pinmeto.com/blog/risks-of-not-claiming-gmb-listings>
- **U2** (research) No computed score, star row, or quality signal on unclaimed profiles; facts only, with their source. _Evidence: Avvo was sued within nine days of launch over algorithmic ratings built from public bar data._ Source: Browne v. Avvo (2007) <https://en.wikipedia.org/wiki/Avvo>
- **U3** (practitioner) Rank unclaimed profiles below verified ones so the first page is bookable; give them a Request this doctor path if shown at all. _Evidence: Zeros (searches with no match) are the liquidity failure to minimise; seeded supply is a bridge, not the product._ Source: a16z network effects; Lenny's Newsletter <https://a16z.com/16-ways-to-measure-network-effects/>
- **U4** (practitioner) Prominent Are you Dr X? Claim this profile, free, plus a visible This is not me / remove link. _Evidence: Zocdoc claim page pattern: preview, editable sections, free, benefits, removal link._ Source: Zocdoc claim page <https://www.zocdoc.com/claim/su-ho-ap>
- **U5** (practitioner) Claim flow: free, show the already-built profile and what the doctor can edit, verify by NPI plus email OTP, promise you can always edit this. _Evidence: Zocdoc and Yelp claim patterns; Doximity starts registration from an NPI stub._ Source: Zocdoc claim; Doximity registration <https://support.doximity.com/hc/en-us/articles/360047630573-How-to-Register-on-Doximity>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
