# 15. Contact

**Area:** Public · **Purpose:** Reach 3affya · **Build:** M2 · **Task:** 1.6 · **In prototype (23 Oct):** Yes

**Notes:** Sends via Resend

## States to design

- Form
- sent

## Data shown

Name, email, message

## Layout call (phone first)

Two stacked choices: WhatsApp button first, then the three-field email form. Address and hours under it. Above the fold: both choices. Hook: WhatsApp opens with a pre-filled greeting.

## Pointers

- WhatsApp click-to-chat first, then email form; address shown. `[G3 H9]`
- Labels above, specific errors; sent state says when to expect a reply. `[F1 F5 L4]`

## Rules referenced

- **F1** (research) Labels above fields, never placeholder-only; single column; mark optional fields, not required. _Evidence: Placeholders strain memory and are skipped by screen readers; users ignored asterisks (eyetracking)._ Source: NN/g Placeholders; cxpartners eyetracking <https://www.nngroup.com/articles/form-design-placeholders/>
- **F5** (research) Adaptive error messages that name the specific sub-rule and the fix, next to the field, in text (not colour alone); never the word invalid. _Evidence: 98% of sites use generic errors; some users took 5 minutes or gave up; WCAG 3.3.1._ Source: Baymard Adaptive Errors; NN/g Error Messages; W3C SC 3.3.1 <https://baymard.com/blog/adaptive-validation-error-messages>
- **G3** (research) WhatsApp click-to-chat for support and (opt-in) reminders; but never health details through it without consent. _Evidence: WhatsApp used by 94% in Saudi, 100% in UAE; 32% name it the most private platform._ Source: NU-Q 2015 and 2019 <https://www.adweek.com/socialtimes/study-northwestern-qatar-whatsapp-middle-east/618962>
- **H9** (research) Show a physical address, the operating entity, and an easy contact route on the home page and footer. _Evidence: Stanford credibility guidelines 2 and 5 (4,500+ participants)._ Source: Stanford Web Credibility Guidelines <https://credibility.stanford.edu/guidelines>
- **L4** (research) Errors: exact problem next to the element, the fix, input preserved, no blame, no humour, no codes by default. _Evidence: NN/g error-message guidelines; WCAG 3.3.1._ Source: NN/g Error-Message Guidelines <https://www.nngroup.com/articles/error-message-guidelines/>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
