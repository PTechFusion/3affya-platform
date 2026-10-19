# 49. Email templates (8)

**Area:** Supporting · **Purpose:** Transactional email · **Build:** M2, M3 · **Task:** 2.9, 3.3, 3.4 · **In prototype (23 Oct):** No

**Notes:** Reminders move to January

## States to design

- Both locales, RTL tested in Gmail and Outlook

## Data shown

Invite, OTP, claim received, approved, rejected, removal confirmed, booking confirmation, refund

## Layout call (phone first)

One layout: wordmark, one-line headline, the key block (code, appointment card, or receipt lines), one button, plain-text details, footer with address. Width 600 px, single column, RTL variant per template.

## Pointers

- Subject states the content; body answers what, when (both zones), how to join, how to change; receipt mirrors review; RTL with LTR codes, 16 px Arabic. `[E1 E2 E3 E4]`
- Any AI-generated line in an email is labelled. `[T4]`

## Rules referenced

- **E1** (research) Subject states the content (Your visit with Dr X is confirmed, 14 Nov, 6 pm Riyadh); preheader carries real info, not view in browser. _Evidence: NN/g diary study: uninformative subjects and wasted preheaders drew the harshest comments._ Source: NN/g, State of Transactional Email <https://www.nngroup.com/articles/state-transactional-email/>
- **E2** (research) Answer every likely question in the body (what, when in both zones, how to join, how to change, what to prepare); no ads; works on a small screen. _Evidence: Users annoyed by emails that require extra work or carry sales pitches._ Source: NN/g, State of Transactional Email <https://www.nngroup.com/articles/state-transactional-email/>
- **E3** (research) Receipt mirrors the review step: total most prominent, the three lines, last 4 digits, both times, change and cancel links. _Evidence: Baymard order-review information list._ Source: Baymard, Office Depot Order Review <https://baymard.com/research-articles/office-depot-order-review-experience>
- **E4** (guideline) RTL email: dir=rtl on the table cells, Arabic at 16 px or larger, numbers and codes isolated LTR; test in Gmail and Outlook. _Evidence: W3C inline bidi; Apple +2 pt guidance._ Source: W3C inline bidi markup <https://www.w3.org/International/articles/inline-bidi-markup/>
- **T4** (law) Label every AI summary as AI-generated at the top with a one-tap route to a human; show Reviewed by Dr X or Not yet reviewed. _Evidence: California AB 3030 requires AI disclosure and a human route; only 54 of 100 LLM summaries reached top accuracy, 18 flagged for safety risk._ Source: Duane Morris on AB 3030; JAMA Netw Open 2024 <https://www.duanemorris.com/alerts/california_passes_novel_law_governing_generative_ai_healthcare_1224.html>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
