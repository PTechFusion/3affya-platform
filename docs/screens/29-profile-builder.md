# 29. Profile builder

**Area:** Professional · **Purpose:** Claim, onboard, edit, see the card live · **Build:** M2 · **Task:** 2.4, 2.5 · **In prototype (23 Oct):** Yes

**Notes:** ikioo flow restyled; replaces 5 screens; phone layout with sticky mini card

## States to design

- Pre-filled from registry
- editing
- credentials uploaded (pending)
- submitted for review
- rejected with reason
- live

## Data shown

Photo, names (en, ar), specialty, city and state, languages and dialect, visit types and fees, ages, video link, training, bio (en, ar), up to 10 expertise tags, credential uploads, publish checklist, live DoctorCard front and back, Arabic preview

## Layout call (phone first)

Phone: form sections stacked with a sticky mini card at the top that updates live; tap it to see the full card and flip. Desktop: form left, full card right, pinned. Section order: photo, names, specialty and city, languages, visit types and fees, training and credentials, bio, tags, availability link, publish checklist. Progress bar under the header starts part-filled. Above the fold: mini card, photo step. Hook: the card changing as you type.

## Pointers

- Opens pre-filled from registry; required = NPI, licence, board, specialty, photo; checklist starts partly filled with steps remaining. `[B1 B2 B3]`
- Live card is the reward; photo step says profiles with photos get about 2x views. `[B4 B5 C3]`
- Photo guidance: white coat, plain background, no group or stock; reject obvious stock. `[C4 G2]`
- Structured fields: years in practice, board and status (board eligible is text, not badge), training, languages with dialect, Accepting (off until availability set). `[B6 B7 S16]`
- Labels above, chunks of 4 to 6, validate on blur, specific errors; Arabic fields budget 30% more width. `[F1 F3 F4 F5 R8]`
- Arabic preview aligns English bio by its language; NPI and phone stay LTR. `[R4 R3]`

## Rules referenced

- **B1** (practitioner) Start from the pre-seeded stub (Find your profile), never a blank form. _Evidence: Doximity registration starts by claiming an NPI stub; about 70% of US doctors are on it._ Source: Doximity registration <https://support.doximity.com/hc/en-us/articles/360047630573-How-to-Register-on-Doximity>
- **B2** (research) Required fields are only what admin will verify (NPI, licence, board, specialty, photo); everything else is complete later. _Evidence: Practices spend about USD 2.76B a year updating directory data; 40%+ never correct their listings._ Source: AHA on CAQH; Healthgrades <https://www.aha.org/node/402650>
- **B3** (research) Endowed progress: start the checklist partly filled from registry data and show steps remaining. _Evidence: 12-stamp card with 2 free stamps completed in median 10 days vs 15; Zeigarnik effect._ Source: Kivetz et al. via Columbia Business School <https://business.columbia.edu/insights/chazen-global-insights/goal-gradient-hypothesis-resurrected-purchase-acceleration>
- **B4** (research) Live preview card that renders exactly as the public card; show the benefit at the step (photos get about 2x views). _Evidence: NN/g heuristics 1 and 6; Doximity 500k-profile analysis._ Source: NN/g 10 Heuristics; Doximity <https://www.nngroup.com/articles/ten-usability-heuristics/>
- **B5** (research) Deliver value before asking for effort: show the claimed card and benefits before Stripe onboarding. _Evidence: Fogg B=MAP; reciprocity._ Source: Fogg Behavior Model; Growth.Design psychology <https://behaviormodel.org/>
- **B6** (practitioner) Structured fields, not free text: years in practice, board and status, training, languages with dialect, Accepting new patients (default off until availability is set). _Evidence: NCQA primary-source verification needs board, licence and training as separate items; one-third of patients filter on accepting._ Source: Verifiable on NCQA; Healthgrades <https://verifiable.com/blog/ncqa-primary-source-verification-requirements>
- **B7** (research) Board eligible is a distinct text label, never the badge; reject board certified claims without a named ABMS/AOA board. _Evidence: 78% of consumers conflate licensure with certification; FTC treats unsubstantiated claims as deceptive._ Source: ABMS survey; FTC <https://www.abderm.org/media/40431/abms-2010-consumer-survey.pdf>
- **C3** (practitioner) Headshot on every card; missing photo is a blocking profile defect; neutral specialty placeholder for unclaimed, never a broken image. _Evidence: Profiles with photos get 60% more engagement (Healthgrades); about 2x views across 500,000 Doximity profiles._ Source: Healthgrades provider profiles; Doximity 500k profiles <https://blog.doximity.com/articles/doctors-headshots-5-striking-lessons-from-500-000-physician-profiles>
- **C4** (research) Photo guidance: formal attire with white coat (scrubs plus coat for surgical and ER), plain background, no group or stock photos; a smile is optional. _Evidence: 4,062-patient study: white coat rated highest (8.1/10); no significant trust difference between smiling and neutral (n=268)._ Source: Petrilli BMJ Open 2018; Univ. Augsburg smile study <https://bmjopen.bmj.com/content/8/5/e021239>
- **F1** (research) Labels above fields, never placeholder-only; single column; mark optional fields, not required. _Evidence: Placeholders strain memory and are skipped by screen readers; users ignored asterisks (eyetracking)._ Source: NN/g Placeholders; cxpartners eyetracking <https://www.nngroup.com/articles/form-design-placeholders/>
- **F3** (research) Group long forms into chunks of 4 to 6 fields with headings; show all steps with the current one highlighted; allow back and save-and-resume. _Evidence: 15-field form regrouped into three chunks (NN/g); wizard guidelines; users want to know steps remaining._ Source: NN/g Form White Space; NN/g Wizards <https://www.nngroup.com/articles/wizards/>
- **F4** (research) Validate on blur, never on untouched fields; re-check on keystroke once an error exists; clear the error the instant it is fixed. _Evidence: 31% have no inline validation; premature errors made a user feel they broke the site._ Source: Baymard Inline Validation; Smashing live validation <https://baymard.com/research-articles/inline-form-validation>
- **F5** (research) Adaptive error messages that name the specific sub-rule and the fix, next to the field, in text (not colour alone); never the word invalid. _Evidence: 98% of sites use generic errors; some users took 5 minutes or gave up; WCAG 3.3.1._ Source: Baymard Adaptive Errors; NN/g Error Messages; W3C SC 3.3.1 <https://baymard.com/blog/adaptive-validation-error-messages>
- **G2** (research) Real human photos, conservative dress, both genders, some group imagery; nothing that reads as non-local stock. _Evidence: Of 73 top Saudi sites, 90% include humans, 81% conservative imagery, 68% both genders._ Source: Namoun & Alkhodre 2019 <https://thesai.org/Downloads/Volume10No4/Paper_72-Towards_Usability_Guidelines_for_the_Design_of_Effective_Arabic_Websites.pdf>
- **R3** (guideline) Never reverse digits: phone numbers, card numbers, OTP codes, booking references stay LTR, left-aligned, wrapped in dir=ltr; use bdi or dir=auto for database strings (doctor and hospital names). _Evidence: W3C: wrap every opposite-direction phrase; Codex: phone numbers never mirrored._ Source: W3C inline bidi; Codex <https://www.w3.org/International/articles/inline-bidi-markup/>
- **R4** (guideline) Align 3+ line paragraphs by their own language (English bio inside an Arabic page stays left-aligned); 1 to 2 line labels follow the page direction; list items share one alignment even when some are Latin. _Evidence: Apple HIG RTL._ Source: Apple HIG, Right to left <https://developer.apple.com/design/human-interface-guidelines/right-to-left>
- **R8** (practitioner) Budget 20 to 30% extra width for Arabic strings; never put text inside images; one typeface family (Readex Pro) for both scripts. _Evidence: A 10-letter English word may become a 2 to 3 word Arabic phrase; 55% of Saudi sites mixed fonts, treated as a usability problem._ Source: freeCodeCamp Arabic UX; Namoun & Alkhodre <https://www.freecodecamp.org/news/designing-for-the-arab-user-basic-arabic-ux-for-business-6ff29d4c7c60/>
- **S16** (research) Specialty names bilingual: Arabic first, English in parentheses; language filter names the dialect. _Evidence: Gulf users code-switch for medical vocabulary; language-concordant care improved outcomes in 25 of 33 studies._ Source: Diamond et al. JGIM 2019; Saudi code-switching studies <https://pubmed.ncbi.nlm.nih.gov/31147980/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
