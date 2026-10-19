# 21. Booking confirmation

**Area:** Patient · **Purpose:** Show what was booked · **Build:** M3 · **Task:** 3.3 · **In prototype (23 Oct):** Yes

## States to design

- Default

## Data shown

Time in both timezones, video link, .ics, receipt link, share records prompt

## Layout call (phone first)

Green check and one line, then the appointment card (time in both zones, join link), Add to calendar, then a three-item prepare checklist with Test your device, then Share records prompt, then receipt link. Above the fold: card and calendar button. Hook: Test your device.

## Pointers

- Peak-end: both times with zones, join link, add to calendar, what to prepare, how to change, expected lead time. `[P10 P6]`
- One-tap device check link; not-for-emergencies line with local number. `[G4 H14]`
- Share records prompt explains AI consent and who will see them. `[T3 T7]`

## Rules referenced

- **G4** (research) One-tap pre-call device check and an installation-free join; keep a phone fallback. _Evidence: Saudi n=916: 92.8% preferred virtual, 20.5% had technical difficulties; n=385: about half found video visits complex._ Source: MDPI Healthcare 2024; Frontiers 2024 <https://www.mdpi.com/2227-9032/12/10/1001>
- **H14** (guideline) Show a not-for-emergencies line with the local emergency number for the viewer's country. _Evidence: DHA excludes emergencies from telehealth; HHS: 911 only works in the patient's location._ Source: Kayrouz UAE telehealth; HHS emergency plan <https://telehealth.hhs.gov/providers/preparing-patients-for-telehealth/creating-an-emergency-plan>
- **P6** (guideline) Every slot in the patient's local time with the zone named (3:00 PM Riyadh, GMT+3), doctor's time secondary; store UTC; recompute each render because the Gulf has no DST and the US does. _Evidence: Saudi, Kuwait, Qatar, Bahrain UTC+3; UAE, Oman UTC+4; no DST in the Gulf._ Source: timedate.org Middle East zones; HHS <https://timedate.org/time-zones/middle-east>
- **P10** (guideline) Confirmation is the peak and the end: both times, join link, add to calendar, what to prepare (device test, private room, ID), expected lead time, how to change. _Evidence: Peak-end rule; AMA pre-visit checklist (camera, mic, ~384 kbps, private well-lit room, ID)._ Source: Laws of UX Peak-End; AMA Telehealth Playbook <https://www.ama-assn.org/system/files/2020-10/telehealth-implementation-playbook-appendix-i3.pdf>
- **T3** (research) Separate, explicit consent before any uploaded record is processed by AI, distinct from the privacy consent; say where data is stored and processed. _Evidence: 46% want permission asked before AI is used on their records, 38% notification (n=3,000, Jan 2026); UAE law restricts health data leaving the country._ Source: Univ. of Michigan AI consent survey; UAE ICT Health Law <https://medresearch.umich.edu/research-news/ai-healthcare-notification-and-consent-preferences-based-us-national-survey>
- **T7** (research) Who can see this panel on every record and share; share expiry visible; revoke in one tap. _Evidence: Over 12% withheld information from providers over privacy fears; only about 25% very confident in record privacy._ Source: JMIR privacy survey via Becker's <https://www.beckershospitalreview.com/healthcare-information-technology/patient-perception-of-health-record-privacy-security-6-findings/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
