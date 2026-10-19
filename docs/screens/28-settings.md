# 28. Settings

**Area:** Patient · **Purpose:** Language, timezone, delete account · **Build:** M3 · **Task:** 3.6 · **In prototype (23 Oct):** Yes

## States to design

- Default
- delete confirm

## Data shown

Locale, IANA timezone, delete

## Layout call (phone first)

Grouped list: Language, Timezone, Calendar (Gregorian, Hijri on), Notifications, then a Danger section with Delete uploads and Delete account, each explaining retention. Above the fold: first two groups.

## Pointers

- Delete explains what is removed and what retention keeps; confirmation buttons name the outcome. `[T8 B10]`
- Timezone from a GCC-first list; Gregorian with optional Hijri; language in its own script. `[P6 N3 H10]`

## Rules referenced

- **B10** (research) Prefer undo over confirmation for routine actions; confirmation dialogs only for irreversible actions, buttons that name the outcome (Cancel booking / Keep booking). _Evidence: Frequent confirmations train click-through._ Source: NN/g Confirmation Dialogs <https://www.nngroup.com/articles/confirmation-dialog/>
- **H10** (guideline) Language switcher in the header, each language in its own script (العربية / English), globe icon, never a flag. _Evidence: W3C i18n: options in the target language, recognisable icon, keep on-page links even with auto-detect._ Source: W3C, Language selection <https://www.w3.org/International/questions/qa-navigation-select>
- **N3** (guideline) Gregorian as the primary calendar; Hijri optional secondary (useful around Ramadan and Eid). _Evidence: Saudi Cabinet approved Gregorian for official dealings (31 Oct 2023); banks already used it._ Source: Gulf News; Arab News 2023 <https://gulfnews.com/world/gulf/saudi/saudi-arabia-adopts-gregorian-calendar-use-in-official-dealings-1.99118179>
- **P6** (guideline) Every slot in the patient's local time with the zone named (3:00 PM Riyadh, GMT+3), doctor's time secondary; store UTC; recompute each render because the Gulf has no DST and the US does. _Evidence: Saudi, Kuwait, Qatar, Bahrain UTC+3; UAE, Oman UTC+4; no DST in the Gulf._ Source: timedate.org Middle East zones; HHS <https://timedate.org/time-zones/middle-east>
- **T8** (research) Delete my uploads and Delete my account controls that state what deletion covers and what legal retention keeps. _Evidence: 37% think AI will make record security worse; UAE mandates 25-year retention for provider records._ Source: Pew 2023; Al Tamimi UAE ICT Health Law <https://www.pewresearch.org/science/2023/02/22/60-of-americans-would-be-uncomfortable-with-provider-relying-on-ai-in-their-own-health-care/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
