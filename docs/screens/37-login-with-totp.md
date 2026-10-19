# 37. Login with TOTP

**Area:** Admin · **Purpose:** Secure admin access · **Build:** M2 · **Task:** 2.8 · **In prototype (23 Oct):** Yes

**Notes:** No TOTP, no access (tested)

## States to design

- Email
- code
- TOTP
- refused

## Data shown

Email, OTP, TOTP

## Layout call (phone first)

Centred card, three sequential steps replacing each other: email, code, authenticator code. No branding beyond the wordmark. Above the fold: the card.

## Pointers

- Single-field codes, paste works, errors in text; refused state gives no hint which factor failed. `[F6 W4 F5]`

## Rules referenced

- **F5** (research) Adaptive error messages that name the specific sub-rule and the fix, next to the field, in text (not colour alone); never the word invalid. _Evidence: 98% of sites use generic errors; some users took 5 minutes or gave up; WCAG 3.3.1._ Source: Baymard Adaptive Errors; NN/g Error Messages; W3C SC 3.3.1 <https://baymard.com/blog/adaptive-validation-error-messages>
- **F6** (guideline) OTP: one field, inputmode numeric, autocomplete one-time-code, paste must work; never reveal whether an email exists; rate-limit instead. _Evidence: WCAG 3.3.8: manual transcription fails; split boxes that reject paste are a cited failure._ Source: Cloud Four OTP inputs; W3C SC 3.3.8; Baymard security caveat <https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html>
- **W4** (guideline) Never block paste or autofill on sign-in fields; label fields so password managers can fill them. _Evidence: WCAG 2.2 SC 3.3.8._ Source: W3C SC 3.3.8 <https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
