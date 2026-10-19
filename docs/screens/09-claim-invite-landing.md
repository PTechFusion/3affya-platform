# 9. Claim invite landing

**Area:** Public · **Purpose:** Doctor opens invite link · **Build:** M2 · **Task:** 2.3 · **In prototype (23 Oct):** Yes

**Notes:** Rate limited 10 per IP per hour

## States to design

- Valid token
- expired
- used
- forged

## Data shown

Pre-filled name and specialty; OTP sign-up; request new invite

## Layout call (phone first)

Centred single column: the pre-built card at the top (name, specialty from registry), one sentence of what claiming gives, email field pre-filled, Send code button, then the six-digit field. Expired or used token shows the same card with Request a new link. Above the fold: card and email field. Hook: the card is already theirs.

## Pointers

- Show the pre-built profile first (name, specialty from registry), then OTP; promise you can always edit this; checklist starts partly filled. `[U5 B1 B3]`
- OTP single field, numeric keyboard, paste works; Open Gmail link; rate-limit, do not reveal whether the email exists. `[F6 F7 W4]`
- Visible This is not me; one line that claiming means patients will see you, so keep availability current. `[U4 U6]`

## Rules referenced

- **B1** (practitioner) Start from the pre-seeded stub (Find your profile), never a blank form. _Evidence: Doximity registration starts by claiming an NPI stub; about 70% of US doctors are on it._ Source: Doximity registration <https://support.doximity.com/hc/en-us/articles/360047630573-How-to-Register-on-Doximity>
- **B3** (research) Endowed progress: start the checklist partly filled from registry data and show steps remaining. _Evidence: 12-stamp card with 2 free stamps completed in median 10 days vs 15; Zeigarnik effect._ Source: Kivetz et al. via Columbia Business School <https://business.columbia.edu/insights/chazen-global-insights/goal-gradient-hypothesis-resurrected-purchase-acceleration>
- **F6** (guideline) OTP: one field, inputmode numeric, autocomplete one-time-code, paste must work; never reveal whether an email exists; rate-limit instead. _Evidence: WCAG 3.3.8: manual transcription fails; split boxes that reject paste are a cited failure._ Source: Cloud Four OTP inputs; W3C SC 3.3.8; Baymard security caveat <https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html>
- **F7** (practitioner) Replace the passive check your email screen with a provider-specific inbox link (Open Gmail). _Evidence: A/B test: +7% email confirmation rate._ Source: Growth.Design, Sniper Link <https://growth.design/case-studies/sniper-link>
- **U4** (practitioner) Prominent Are you Dr X? Claim this profile, free, plus a visible This is not me / remove link. _Evidence: Zocdoc claim page pattern: preview, editable sections, free, benefits, removal link._ Source: Zocdoc claim page <https://www.zocdoc.com/claim/su-ho-ap>
- **U5** (practitioner) Claim flow: free, show the already-built profile and what the doctor can edit, verify by NPI plus email OTP, promise you can always edit this. _Evidence: Zocdoc and Yelp claim patterns; Doximity starts registration from an NPI stub._ Source: Zocdoc claim; Doximity registration <https://support.doximity.com/hc/en-us/articles/360047630573-How-to-Register-on-Doximity>
- **U6** (research) Warn and prepare: claiming invites scrutiny; set up alerts and reply tooling at claim time (for when reviews ship). _Evidence: After owners claimed Yelp pages, average rating fell over 10% for more than a year._ Source: FIU / Information Systems Research 2026 <https://business.fiu.edu/news/2026/claiming-your-business-page-on-review-platforms-can-have-unintended-effects-on-customer-reviews-study-shows.html>
- **W4** (guideline) Never block paste or autofill on sign-in fields; label fields so password managers can fill them. _Evidence: WCAG 2.2 SC 3.3.8._ Source: W3C SC 3.3.8 <https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
