# 19. Slot picker

**Area:** Patient · **Purpose:** Choose a time in the patient's timezone · **Build:** M3 · **Task:** 3.2 · **In prototype (23 Oct):** Yes

**Notes:** DST tests across Riyadh, Dubai, London

## States to design

- Slots
- no slots this week
- hold started

## Data shown

Doctor card, calendar, slots converted to viewer timezone, visit type

## Layout call (phone first)

Mini doctor card at the top, visit-type segmented control, week strip (swipe), slot grid of 48 px buttons in the patient zone with the zone named, doctor time in small text on the selected slot. Reason, age group and for whom appear after a slot is picked. Sticky Continue. Above the fold: card, visit type, this week's slots. Hook: the next available slot is pre-highlighted.

## Pointers

- Patient zone named on every slot, doctor time secondary; Western digits forced; weekends shaded per the patient's country. `[P6 N1 P7]`
- 48 px slot buttons; hold starts within 400 ms; calendar chevrons mirrored in RTL, clock icon not. `[W2 L2 R2]`
- Ask visit reason, age group and for whom before the hold; visit type choice with best-for line. `[P8 C12]`
- No slots this week: show next available week and a Request a time path, never an empty grid. `[L3 S6]`

## Rules referenced

- **C12** (research) Visit type (video or phone) is an explicit choice with a one-line best-for hint; do not default everyone to video. Note: Saudi rules may require video (Q1). _Evidence: Patients trusted phone more than video for confidentiality (72.5% vs 59.8%); phone was the top format for 46.5% (n=567)._ Source: JMIR Human Factors 2023 <https://humanfactors.jmir.org/2023//e50740/>
- **L2** (practitioner) Respond to every tap within 400 ms with at least an optimistic change (filters, slot holds, chat). _Evidence: Doherty threshold (IBM 1982)._ Source: Laws of UX, Doherty Threshold <https://lawsofux.com/doherty-threshold/>
- **L3** (research) Every empty state says what the container is, why it is empty, and gives one direct action; never show No records while content is still loading. _Evidence: NN/g empty-state guidelines._ Source: NN/g, Designing Empty States <https://www.nngroup.com/articles/empty-state-interface-design/>
- **N1** (guideline) Western digits everywhere, forced in code: Intl.NumberFormat('ar-SA-u-nu-latn') and ar-AE-u-nu-latn; CLDR defaults ar-SA to Arabic-Indic digits. _Evidence: Saudi is singled out as preferring Western numerals, but CLDR's default for ar-SA is native digits._ Source: Wikipedia Eastern Arabic numerals; CLDR-users 2019 <https://corp.unicode.org/pipermail/cldr-users/2019-April/000918.html>
- **P6** (guideline) Every slot in the patient's local time with the zone named (3:00 PM Riyadh, GMT+3), doctor's time secondary; store UTC; recompute each render because the Gulf has no DST and the US does. _Evidence: Saudi, Kuwait, Qatar, Bahrain UTC+3; UAE, Oman UTC+4; no DST in the Gulf._ Source: timedate.org Middle East zones; HHS <https://timedate.org/time-zones/middle-east>
- **P7** (guideline) Shade weekends per country: Fri-Sat for Saudi, Kuwait, Qatar, Oman, Bahrain; Sat-Sun for UAE (since 2022); never hard-code Sat-Sun. _Evidence: UAE moved to Saturday-Sunday on 1 Jan 2022; the rest keep Sunday-Thursday weeks._ Source: Executive Traveller; Wikipedia Workweek <https://www.executivetraveller.com/news/uae-switches-weekend-to-saturday-sunday>
- **P8** (practitioner) Collect visit reason, patient age group and for-whom (self or relative) before confirming; let the doctor set lead time (2 h default) and age rules. _Evidence: Wrong-fit bookings come from missing reason, age preferences and lead time (Zocdoc); Saudi families often take part in decisions, so ask, do not assume._ Source: Zocdoc wrong-fit bookings; Alfahmi BMC Med Ethics 2022 <https://www.zocdoc.com/blog/facts/wrong-fit-bookings-lead-quality/>
- **R2** (guideline) Mirror: back and next, chevrons, steppers, progress bars (0% on the right), pagination, carousels, text-alignment icons. Do not mirror: media controls, clocks, search magnifier, pencil, checkmarks, logos, card-scheme marks, photos. _Evidence: Apple HIG, Material m1, Wikimedia Codex, Microsoft mirroring guidance agree._ Source: Apple HIG RTL; Material m1 Bidirectionality; Codex <https://m1.material.io/usability/bidirectionality.html>
- **S6** (research) Zero results must offer: relaxed-filter parent scope, 3 to 5 alternative queries with previews (auto-applied if only one works), popular doctors, and a human contact. _Evidence: About half of no-results pages raise abandonment; spelling tips alone are not enough._ Source: Baymard, No Results Page <https://baymard.com/research-articles/no-results-page>
- **W2** (guideline) Pointer targets at least 24x24 px; 48 px for primary mobile actions, slot buttons and chips. _Evidence: WCAG 2.2 SC 2.5.8; Fitts's law; Digital.gov 48 px._ Source: W3C SC 2.5.8 <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
