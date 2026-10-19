# 26. Summary and timeline

**Area:** Patient · **Purpose:** Read the one page summary · **Build:** M3 · **Task:** 3.9, 3.10 · **In prototype (23 Oct):** Yes

## States to design

- Overview
- timeline
- flags
- source page open

## Data shown

Diagnoses, procedures, medications, allergies, results with page links; missing and conflict flags; unreadable flags

## Layout call (phone first)

AI-generated label and reviewed state at the top, Talk to a human beside it. Tabs Overview, Timeline, Flags. Overview: five blocks (diagnoses, procedures, medications, allergies, results), each item with a source-page link opening a side viewer (sheet on phone). Timeline is vertical on phone. Above the fold: label and first two blocks. Hook: tap any item to see the source page.

## Pointers

- AI-generated label at the top, Reviewed by Dr X or Not yet reviewed, Talk to a human; not-a-diagnosis in the body. `[T4 T5 Q6]`
- Release immediately with a framing line; every statement links to its source page; explain each number; something missing? link. `[T2 T6 X1]`
- Timeline numerals LTR with mirrored axis in Arabic; download is a primary action. `[R11 T1]`

## Rules referenced

- **Q6** (law) California AB 3030 (from 1 Jan 2025): AI-generated patient communications about clinical information must disclose AI generation and how to reach a human, unless a licensed provider reviewed them. Apply to the summary and the intake chat regardless of state. _Evidence: Duane Morris alert._ Source: Duane Morris on AB 3030 <https://www.duanemorris.com/alerts/california_passes_novel_law_governing_generative_ai_healthcare_1224.html>
- **R11** (research) Charts: numerals LTR, axis order mirrored by hand; do not trust library defaults. _Evidence: 11 Arabic-speaking practitioners: RTL support in chart tools is fragmented._ Source: Alebri et al. 2026 <https://arxiv.org/abs/2607.24571>
- **T1** (guideline) View and download are the two primary portal actions; phone-first layout. _Evidence: 90% of portal users view results, 70% notes, 32% download; 51% use an app; 57% of adults use a portal._ Source: ONC Data Brief 69 (2022) <https://healthit.gov/data/data-briefs/individuals-access-and-use-patient-portals-and-smartphone-health-apps-2022>
- **T2** (research) Release the summary to the patient immediately with a worry-reducing framing line; add context to abnormal flags. _Evidence: 96% prefer immediate access (n=8,139); 7.5% were more worried, nearly half less; abnormal-result viewers 3x as likely to worry._ Source: JAMA Netw Open 2023 via UT Southwestern <https://www.utsouthwestern.edu/newsroom/articles/year-2023/march-medical-test-results-online.html>
- **T4** (law) Label every AI summary as AI-generated at the top with a one-tap route to a human; show Reviewed by Dr X or Not yet reviewed. _Evidence: California AB 3030 requires AI disclosure and a human route; only 54 of 100 LLM summaries reached top accuracy, 18 flagged for safety risk._ Source: Duane Morris on AB 3030; JAMA Netw Open 2024 <https://www.duanemorris.com/alerts/california_passes_novel_law_governing_generative_ai_healthcare_1224.html>
- **T5** (guideline) Not a diagnosis, does not replace the consultation: in the body of the summary, not only a footer. _Evidence: Disclaimer rates in AI health answers fell from 26% to 1% (2022 to 2025); FTC: no AI exemption._ Source: eMarketer on MIT Tech Review; FTC Operation AI Comply <https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes>
- **T6** (guideline) Every statement links to its source page; explain every number (what it means, normal range); show what we know and what we do not; a something missing? link. _Evidence: CDC CCI items 15 to 17; FDA CDS: basis must be reviewable; 96% of OpenNotes patients understood notes, 6% found something missing._ Source: CDC Clear Communication Index; OpenNotes JGIM <https://www.cdc.gov/ccindex/pdf/clear-communication-user-guide.pdf>
- **X1** (research) Write patient-facing copy at grade 6 reading level; main message in the first paragraph, visible without scrolling. _Evidence: Plain-language rewrite lifted task success 46% to 82% and cut time 22.3 to 9.5 min (n=50); AMA/NIH recommend grade 4 to 6; CDC CCI passing score 90._ Source: NN/g Lower-Literacy; CDC Clear Communication Index <https://www.nngroup.com/articles/writing-for-lower-literacy-users/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
