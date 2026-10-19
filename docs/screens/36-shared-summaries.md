# 36. Shared summaries

**Area:** Professional · **Purpose:** Read what patients shared · **Build:** M3 · **Task:** 3.10 · **In prototype (23 Oct):** Yes

## States to design

- Empty
- list
- viewer

## Data shown

Summaries shared with this professional, expiry

## Layout call (phone first)

Rows: patient first name, shared on, expires on, Open. Viewer reuses the patient summary screen with the AI label and reviewed state. Above the fold: the list.

## Pointers

- AI label and reviewed state carry through; expiry shown. `[T4 T7]`

## Rules referenced

- **T4** (law) Label every AI summary as AI-generated at the top with a one-tap route to a human; show Reviewed by Dr X or Not yet reviewed. _Evidence: California AB 3030 requires AI disclosure and a human route; only 54 of 100 LLM summaries reached top accuracy, 18 flagged for safety risk._ Source: Duane Morris on AB 3030; JAMA Netw Open 2024 <https://www.duanemorris.com/alerts/california_passes_novel_law_governing_generative_ai_healthcare_1224.html>
- **T7** (research) Who can see this panel on every record and share; share expiry visible; revoke in one tap. _Evidence: Over 12% withheld information from providers over privacy fears; only about 25% very confident in record privacy._ Source: JMIR privacy survey via Becker's <https://www.beckershospitalreview.com/healthcare-information-technology/patient-perception-of-health-record-privacy-security-6-findings/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
