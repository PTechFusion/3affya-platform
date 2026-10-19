# 18. Sign up and login

**Area:** Patient · **Purpose:** OTP by email · **Build:** M3 · **Task:** 3.6 · **In prototype (23 Oct):** Yes

## States to design

- Enter email
- enter code
- error
- rate limited

## Data shown

Email, 6 digit code

## Layout call (phone first)

Centred card: one email field and Continue; second step replaces it with one six-digit field, Open Gmail link, resend timer. Why we ask line under the field. Above the fold: the whole card.

## Pointers

- One OTP field, inputmode numeric, autocomplete one-time-code, paste works, 16 px input; email keyboard, autocorrect off. `[F6 W4 F8]`
- Open Gmail link; sign-in asked only at booking or upload, never to browse. `[F7 F9]`
- Rate-limited state says when to retry; errors in text next to the field. `[F5 L4]`

## Rules referenced

- **F5** (research) Adaptive error messages that name the specific sub-rule and the fix, next to the field, in text (not colour alone); never the word invalid. _Evidence: 98% of sites use generic errors; some users took 5 minutes or gave up; WCAG 3.3.1._ Source: Baymard Adaptive Errors; NN/g Error Messages; W3C SC 3.3.1 <https://baymard.com/blog/adaptive-validation-error-messages>
- **F6** (guideline) OTP: one field, inputmode numeric, autocomplete one-time-code, paste must work; never reveal whether an email exists; rate-limit instead. _Evidence: WCAG 3.3.8: manual transcription fails; split boxes that reject paste are a cited failure._ Source: Cloud Four OTP inputs; W3C SC 3.3.8; Baymard security caveat <https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html>
- **F7** (practitioner) Replace the passive check your email screen with a provider-specific inbox link (Open Gmail). _Evidence: A/B test: +7% email confirmation rate._ Source: Growth.Design, Sniper Link <https://growth.design/case-studies/sniper-link>
- **F8** (research) Right keyboard per field (email, tel, numeric); autocorrect and autocapitalise off on names, emails and codes; inputs rendered at 16 px or larger to stop iOS zoom. _Evidence: 54% of sites fail keyboard types; iOS Safari auto-zooms inputs under 16 px._ Source: Baymard Touch Keyboards; Strahl iOS auto-zoom <https://baymard.com/research-articles/mobile-touch-keyboards>
- **F9** (research) No login wall for browsing; ask for sign-in only at the commitment point (booking, upload). _Evidence: Login walls are among the most annoying patterns; delayed sign-up gave Duolingo +20% DAU; 24% abandoned carts over forced accounts._ Source: NN/g Login Walls; Baymard Guest Checkout <https://www.nngroup.com/articles/login-walls/>
- **L4** (research) Errors: exact problem next to the element, the fix, input preserved, no blame, no humour, no codes by default. _Evidence: NN/g error-message guidelines; WCAG 3.3.1._ Source: NN/g Error-Message Guidelines <https://www.nngroup.com/articles/error-message-guidelines/>
- **W4** (guideline) Never block paste or autofill on sign-in fields; label fields so password managers can fill them. _Evidence: WCAG 2.2 SC 3.3.8._ Source: W3C SC 3.3.8 <https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
