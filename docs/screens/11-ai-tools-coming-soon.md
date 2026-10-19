# 11. AI tools (coming soon)

**Area:** Public · **Purpose:** Tease agents 2 to 11 · **Build:** M2 · **Task:** 1.6 · **In prototype (23 Oct):** Yes

**Notes:** No pricing shown

## States to design

- Default

## Data shown

Agent names and one line each

## Layout call (phone first)

Title, one line of intent, then a two-column list of ten agents with name and one line each, muted style. One CTA: Tell me when these launch (email). Above the fold: title and first four. Hook: the notify field.

## Pointers

- One plain line per agent, front-loaded; no pricing. `[X1 H3]`
- Say every AI output will be labelled and reviewed; not a diagnosis. `[T4 T5]`

## Rules referenced

- **H3** (research) Front-load the first two words of every heading, bullet and paragraph with information-carrying words. _Evidence: F-pattern eyetracking of 232 users: readers catch the first two words of a line far more than the third._ Source: NN/g, F-Shaped Pattern <https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered/>
- **T4** (law) Label every AI summary as AI-generated at the top with a one-tap route to a human; show Reviewed by Dr X or Not yet reviewed. _Evidence: California AB 3030 requires AI disclosure and a human route; only 54 of 100 LLM summaries reached top accuracy, 18 flagged for safety risk._ Source: Duane Morris on AB 3030; JAMA Netw Open 2024 <https://www.duanemorris.com/alerts/california_passes_novel_law_governing_generative_ai_healthcare_1224.html>
- **T5** (guideline) Not a diagnosis, does not replace the consultation: in the body of the summary, not only a footer. _Evidence: Disclaimer rates in AI health answers fell from 26% to 1% (2022 to 2025); FTC: no AI exemption._ Source: eMarketer on MIT Tech Review; FTC Operation AI Comply <https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes>
- **X1** (research) Write patient-facing copy at grade 6 reading level; main message in the first paragraph, visible without scrolling. _Evidence: Plain-language rewrite lifted task success 46% to 82% and cut time 22.3 to 9.5 min (n=50); AMA/NIH recommend grade 4 to 6; CDC CCI passing score 90._ Source: NN/g Lower-Literacy; CDC Clear Communication Index <https://www.nngroup.com/articles/writing-for-lower-literacy-users/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
