# 2. Why US training

**Area:** Public · **Purpose:** Explain the value of US-trained doctors · **Build:** M2 · **Task:** 1.6 · **In prototype (23 Oct):** Yes

## States to design

- Default

## Data shown

Copy from content document

## Layout call (phone first)

Single column: title, one-paragraph answer, then three short sections (what US training means, how we verify, what it costs you), each with a link to the verifier. Sidebar on desktop holds the three-credential strip. Above the fold: the one-paragraph answer. Hook: a Check a doctor link into the directory.

## Pointers

- Grade-6 copy, single column, main message in the first paragraph; front-load headings. `[X1 X2 H3]`
- Link every credential claim to ABMS Certification Matters or the state board; define board certified; last-reviewed date at the bottom. `[X3 H8 X4]`
- Use the medical-tourism fact (USA is Saudi's top destination) as the bridge; explain how the visit works legally in one paragraph. `[H13 H15]`

## Rules referenced

- **H3** (research) Front-load the first two words of every heading, bullet and paragraph with information-carrying words. _Evidence: F-pattern eyetracking of 232 users: readers catch the first two words of a line far more than the third._ Source: NN/g, F-Shaped Pattern <https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered/>
- **H8** (research) Define US board certified in one plain sentence wherever the badge first appears. _Evidence: Only 23% of consumers could define board certification; 78% wrongly think it is required to practise; 91% rate it important once defined._ Source: ABMS 2010 Consumer Survey <https://www.abderm.org/media/40431/abms-2010-consumer-survey.pdf>
- **H13** (research) Lead with US training plus US board certification as the unique signal. _Evidence: On Zocdoc, non-US school graduates scored lower (4.63 vs 4.77); Gulf patients already travel to the US for care (USA is Saudi's top destination)._ Source: JMIR 2024 Zocdoc reviews; IMTJ GCC medical tourism <https://www.jmir.org/2024/1/e51672>
- **H15** (research) Address legality plainly: a short section on how a US doctor can consult a Gulf patient and what the visit can and cannot do. _Evidence: Saudi survey (n=1,024): 60.5% had used telemedicine but only 41.9% felt the legal aspects were clear._ Source: JMIR Formative 2023, Saudi telemedicine <https://formative.jmir.org/2023/1/e46446>
- **X1** (research) Write patient-facing copy at grade 6 reading level; main message in the first paragraph, visible without scrolling. _Evidence: Plain-language rewrite lifted task success 46% to 82% and cut time 22.3 to 9.5 min (n=50); AMA/NIH recommend grade 4 to 6; CDC CCI passing score 90._ Source: NN/g Lower-Literacy; CDC Clear Communication Index <https://www.nngroup.com/articles/writing-for-lower-literacy-users/>
- **X2** (research) Single main column, static text, linear menus on explanatory pages; no moving text or fly-outs. _Evidence: Same NN/g study: two-dimensional layouts and animation hurt lower-literacy readers._ Source: NN/g Lower-Literacy <https://www.nngroup.com/articles/writing-for-lower-literacy-users/>
- **X3** (research) Make every credential claim verifiable: link to the certifying board or licence registry. _Evidence: Stanford guideline 1: easy third-party verification raises credibility; ABMS Certification Matters is the public lookup._ Source: Stanford guidelines; ABMS Certification Matters <https://www.certificationmatters.org/>
- **X4** (research) Show a last-reviewed date on medical, process, pricing and legal content. _Evidence: Stanford guideline 8: visibly recent content increases credibility._ Source: Stanford Web Credibility Guidelines <https://credibility.stanford.edu/guidelines>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
