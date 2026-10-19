# 48. Brand page /brand

**Area:** Supporting · **Purpose:** Tokens and components · **Build:** M1 · **Task:** 1.2 · **In prototype (23 Oct):** Yes

**Notes:** Built from the approved theme board

## States to design

- Both locales

## Data shown

Colours, type, spacing, every component, DoctorCard states, coach mark

## Layout call (phone first)

Left contents rail, sections: colours, type (both scripts side by side with the Arabic scale), spacing, icons with a mirror / do not mirror table, buttons, fields and errors, tags, skeletons, empty states, DoctorCard in every state, coach mark. Locale toggle at the top flips the whole page.

## Pointers

- Tokens: Arabic type scale (16/18 px body, +2 pt beside Latin, line height 1.5), letter-spacing 0 for ar, font-synthesis none, 30% width budget; contrast 4.5:1 checked for gold on sand; 24 and 48 px targets. `[R5 R6 R8 W1 W2]`
- Icon mirroring list (mirror vs never); bdi and dir=ltr helpers; number formatter with nu-latn. `[R2 R3 N1]`
- Form field, error, skeleton and empty-state components built once here. `[F1 F5 L1 L3]`

## Rules referenced

- **F1** (research) Labels above fields, never placeholder-only; single column; mark optional fields, not required. _Evidence: Placeholders strain memory and are skipped by screen readers; users ignored asterisks (eyetracking)._ Source: NN/g Placeholders; cxpartners eyetracking <https://www.nngroup.com/articles/form-design-placeholders/>
- **F5** (research) Adaptive error messages that name the specific sub-rule and the fix, next to the field, in text (not colour alone); never the word invalid. _Evidence: 98% of sites use generic errors; some users took 5 minutes or gave up; WCAG 3.3.1._ Source: Baymard Adaptive Errors; NN/g Error Messages; W3C SC 3.3.1 <https://baymard.com/blog/adaptive-validation-error-messages>
- **L1** (research) Response limits: under 1 s no indicator; 1 to 10 s a content-shaped skeleton (onset after about 1 s) or a module spinner; over 10 s a progress bar with estimate and cancel. _Evidence: Nielsen's three limits; frame-only skeletons make users think the page is broken._ Source: NN/g Response Times; Skeleton Screens 101 <https://www.nngroup.com/articles/response-times-3-important-limits/>
- **L3** (research) Every empty state says what the container is, why it is empty, and gives one direct action; never show No records while content is still loading. _Evidence: NN/g empty-state guidelines._ Source: NN/g, Designing Empty States <https://www.nngroup.com/articles/empty-state-interface-design/>
- **N1** (guideline) Western digits everywhere, forced in code: Intl.NumberFormat('ar-SA-u-nu-latn') and ar-AE-u-nu-latn; CLDR defaults ar-SA to Arabic-Indic digits. _Evidence: Saudi is singled out as preferring Western numerals, but CLDR's default for ar-SA is native digits._ Source: Wikipedia Eastern Arabic numerals; CLDR-users 2019 <https://corp.unicode.org/pipermail/cldr-users/2019-April/000918.html>
- **R2** (guideline) Mirror: back and next, chevrons, steppers, progress bars (0% on the right), pagination, carousels, text-alignment icons. Do not mirror: media controls, clocks, search magnifier, pencil, checkmarks, logos, card-scheme marks, photos. _Evidence: Apple HIG, Material m1, Wikimedia Codex, Microsoft mirroring guidance agree._ Source: Apple HIG RTL; Material m1 Bidirectionality; Codex <https://m1.material.io/usability/bidirectionality.html>
- **R3** (guideline) Never reverse digits: phone numbers, card numbers, OTP codes, booking references stay LTR, left-aligned, wrapped in dir=ltr; use bdi or dir=auto for database strings (doctor and hospital names). _Evidence: W3C: wrap every opposite-direction phrase; Codex: phone numbers never mirrored._ Source: W3C inline bidi; Codex <https://www.w3.org/International/articles/inline-bidi-markup/>
- **R5** (research) Arabic body 16 px floor on mobile, 18 px preferred; about +2 pt when Arabic sits beside uppercase Latin; line height 1.5 or more. _Evidence: Apple +2 pt; over 60% of 73 Saudi sites set paragraphs at 12 to 16 px, judged too small; Arabic extenders need extra leading (W3C alreq)._ Source: Apple HIG; Namoun & Alkhodre 2019; W3C alreq <https://thesai.org/Downloads/Volume10No4/Paper_72-Towards_Usability_Guidelines_for_the_Design_of_Effective_Arabic_Websites.pdf>
- **R6** (guideline) letter-spacing: 0 on [lang=ar]; font-synthesis: none; real Readex Pro weights; no italics for Arabic (emphasise with weight or colour); no text-align: justify. _Evidence: Spacing joined letters creates undesirable results (W3C alreq); browsers lack kashida justification; obliques make letters look alike._ Source: W3C alreq; thoughtbot obliques <https://www.w3.org/TR/alreq/>
- **R8** (practitioner) Budget 20 to 30% extra width for Arabic strings; never put text inside images; one typeface family (Readex Pro) for both scripts. _Evidence: A 10-letter English word may become a 2 to 3 word Arabic phrase; 55% of Saudi sites mixed fonts, treated as a usability problem._ Source: freeCodeCamp Arabic UX; Namoun & Alkhodre <https://www.freecodecamp.org/news/designing-for-the-arab-user-basic-arabic-ux-for-business-6ff29d4c7c60/>
- **W1** (guideline) Text contrast 4.5:1 or more (3:1 for 24 px+); check gold on sand and white on lagoon. _Evidence: WCAG 2.2 SC 1.4.3._ Source: W3C SC 1.4.3 <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>
- **W2** (guideline) Pointer targets at least 24x24 px; 48 px for primary mobile actions, slot buttons and chips. _Evidence: WCAG 2.2 SC 2.5.8; Fitts's law; Digital.gov 48 px._ Source: W3C SC 2.5.8 <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
