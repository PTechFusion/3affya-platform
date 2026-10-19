# 1. Home

**Area:** Public · **Purpose:** Land, search, trust · **Build:** M2 · **Task:** 1.6, 2.1 · **In prototype (23 Oct):** Yes

**Notes:** Lagoon hero per approved board; featured carousel moves to January

## States to design

- Default
- search typed
- intake chat open

## Data shown

Hero copy, search box, specialty chips, 1 to 2 verified doctors, 3 steps

## Layout call (phone first)

Lagoon hero (approved board) with headline, one-line sub, search box with specialty autocomplete, four specialty chips. Then a trust strip (Licence verified, US board certified with tooltip, visit from USD X). Then two verified doctor cards, three steps, FAQ teaser, footer with address. Above the fold: headline, search, chips. Hook: the search box returns live suggestions as you type.

## Pointers

- First screenful: tagline that names the buyer (US-trained, Arabic-speaking doctors for you), search box, one CTA. In Arabic the CTA and headline sit top-right. `[H1 H2 R9]`
- Trust strip above any counts: Licence verified, US board certified (one-sentence definition on first appearance), price from X. Lead with US training. `[H7 H8 H13]`
- Real doctor photos only (no stock); conservative dress, both genders. Show counts only if large; otherwise show two verified doctors instead of a number. `[H4 G2 H6]`
- Up to 4 visible nav links on mobile; language switch in the header as العربية / English with a globe, no flags. `[H5 H10]`
- One line: not for emergencies, with the viewer's local emergency number; a short how a US doctor can see you section or link (41.9% of Saudi users unclear on legality). `[H14 H15]`
- No false floor after the hero; LCP 2.5 s on mobile (compress photos, water effect must not block paint); content-shaped skeleton for the doctor strip. `[H11 H12 L1]`

## Rules referenced

- **G2** (research) Real human photos, conservative dress, both genders, some group imagery; nothing that reads as non-local stock. _Evidence: Of 73 top Saudi sites, 90% include humans, 81% conservative imagery, 68% both genders._ Source: Namoun & Alkhodre 2019 <https://thesai.org/Downloads/Volume10No4/Paper_72-Towards_Usability_Guidelines_for_the_Design_of_Effective_Arabic_Websites.pdf>
- **H1** (research) Put the value proposition, the differentiator and the primary CTA in the first screenful, and signal that more follows. _Evidence: 57% of viewing time is above the fold, 74% in the first two screenfuls (NN/g eyetracking 2018)._ Source: NN/g, Scrolling and Attention <https://www.nngroup.com/articles/scrolling-and-attention/>
- **H2** (research) Write a one-line tagline that says what the site does and for whom; never a generic welcome. _Evidence: Homepage must work as an elevator pitch; vague labels have weak information scent._ Source: NN/g, Homepage Design Principles <https://www.nngroup.com/articles/homepage-design-principles/>
- **H4** (research) Use real photos of the actual doctors and team; never stock people or decorative hero figures. _Evidence: Users spent 10% more time on real team portraits than on bios taking 316% more space; stock people are ignored as filler._ Source: NN/g, Photos as Web Content <https://www.nngroup.com/articles/photos-as-web-content/>
- **H5** (research) Show up to 4 top-level links visibly on mobile before hiding the rest; keep visible nav on desktop. _Evidence: Hidden nav: discoverability down 20%+, tasks 39% slower on desktop and 15% on mobile (n=179)._ Source: NN/g, Hamburger Menus <https://www.nngroup.com/articles/hamburger-menus/>
- **H6** (research) Show counts (doctors, specialties, bookings) only when they are large enough to impress; small numbers backfire. _Evidence: A participant judged an article unpopular because it had only 1,000 shares._ Source: NN/g, Social Proof in the UX <https://www.nngroup.com/articles/social-proof-ux/>
- **H7** (research) Put the three most-trusted credentials (licence, board certification, price) above the fold, ahead of any reviews. _Evidence: Licence, board certification and insurance/price rated most important when choosing a clinician; reviews rated least._ Source: J Patient Exp 2022, Choosing a Provider <https://doaj.org/article/30019e7bdeea4028b38558d51565cb57>
- **H8** (research) Define US board certified in one plain sentence wherever the badge first appears. _Evidence: Only 23% of consumers could define board certification; 78% wrongly think it is required to practise; 91% rate it important once defined._ Source: ABMS 2010 Consumer Survey <https://www.abderm.org/media/40431/abms-2010-consumer-survey.pdf>
- **H10** (guideline) Language switcher in the header, each language in its own script (العربية / English), globe icon, never a flag. _Evidence: W3C i18n: options in the target language, recognisable icon, keep on-page links even with auto-detect._ Source: W3C, Language selection <https://www.w3.org/International/questions/qa-navigation-select>
- **H11** (research) Avoid false floors: never end a full-width section with a CTA and whitespace that looks like the page end. _Evidence: Illusion of completeness (NN/g); cut-off items and rhythm signal continuation (CXL)._ Source: NN/g Illusion of Completeness; CXL False Bottom <https://www.nngroup.com/videos/illusion-completeness/>
- **H12** (guideline) Target LCP of 2.5 s or less at the 75th percentile on mobile; compress doctor photos. _Evidence: Core Web Vitals: good is 2.5 s or less; most Saudi sites miss 3 s because image sets exceed 1,500 KB._ Source: web.dev LCP; Namoun & Alkhodre 2019 <https://web.dev/articles/lcp>
- **H13** (research) Lead with US training plus US board certification as the unique signal. _Evidence: On Zocdoc, non-US school graduates scored lower (4.63 vs 4.77); Gulf patients already travel to the US for care (USA is Saudi's top destination)._ Source: JMIR 2024 Zocdoc reviews; IMTJ GCC medical tourism <https://www.jmir.org/2024/1/e51672>
- **H14** (guideline) Show a not-for-emergencies line with the local emergency number for the viewer's country. _Evidence: DHA excludes emergencies from telehealth; HHS: 911 only works in the patient's location._ Source: Kayrouz UAE telehealth; HHS emergency plan <https://telehealth.hhs.gov/providers/preparing-patients-for-telehealth/creating-an-emergency-plan>
- **H15** (research) Address legality plainly: a short section on how a US doctor can consult a Gulf patient and what the visit can and cannot do. _Evidence: Saudi survey (n=1,024): 60.5% had used telemedicine but only 41.9% felt the legal aspects were clear._ Source: JMIR Formative 2023, Saudi telemedicine <https://formative.jmir.org/2023/1/e46446>
- **L1** (research) Response limits: under 1 s no indicator; 1 to 10 s a content-shaped skeleton (onset after about 1 s) or a module spinner; over 10 s a progress bar with estimate and cancel. _Evidence: Nielsen's three limits; frame-only skeletons make users think the page is broken._ Source: NN/g Response Times; Skeleton Screens 101 <https://www.nngroup.com/articles/response-times-3-important-limits/>
- **R9** (research) In Arabic, the reading-start corner is top-right: CTA, doctor name, price and next slot go there (flipped F). _Evidence: RTL readers follow a flipped F pattern; KSU eyetracking: Arabic users scanned results right to left, attention on the top two._ Source: NN/g F-Pattern; Al-Rashed 2010 KSU <https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
