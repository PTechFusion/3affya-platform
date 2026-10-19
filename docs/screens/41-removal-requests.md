# 41. Removal requests

**Area:** Admin · **Purpose:** Handle this is me / remove me · **Build:** M2 · **Task:** 2.8 · **In prototype (23 Oct):** Yes

**Notes:** 410 within 48 hours

## States to design

- Open with SLA timer
- confirmed
- refused

## Data shown

Request, NPI, reason, timer

## Layout call (phone first)

Table with SLA timer column (colour at 36 h), detail drawer with the request, matching profile, Confirm removal or Refuse with reason.

## Pointers

- SLA timer visible; confirmed state triggers 410 and audit entry. `[A3 U4]`

## Rules referenced

- **A3** (research) Queue removal requests and (later) 1-star reviews for human moderation with evidence rules; providers can never delete reviews. _Evidence: A single 1-star review was followed by a 2.3 to 2.6% drop in new-patient volume for 16+ weeks (1.12M appointments)._ Source: AJMC 2023; Zocdoc moderation <https://www.ajmc.com/view/the-impact-of-1-star-physician-ratings-on-new-patient-volume>
- **U4** (practitioner) Prominent Are you Dr X? Claim this profile, free, plus a visible This is not me / remove link. _Evidence: Zocdoc claim page pattern: preview, editable sections, free, benefits, removal link._ Source: Zocdoc claim page <https://www.zocdoc.com/claim/su-ho-ap>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
