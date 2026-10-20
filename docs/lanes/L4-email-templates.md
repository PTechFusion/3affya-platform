# L4. Transactional email templates — branch `lane/emails` — task 2.9 (templates half), screen 49

**Depends on:** nothing for the code; a Resend key and the verified subdomain (L0 item 3) for the test sends.
**Not in this lane:** the introduction inbox (screen 32 exists), booking reminders (January), sending from any flow (each
flow's task wires its own send through `lib/email-templates/send.ts`).

## Read
Screen brief `docs/screens/49-email-templates-8.md` and its rules E1 to E4, T4 in `docs/screen-rules.md`. Task 2.9. ADR-11
(internationalisation). PLAYBOOK §9: screen 49 must import the outreach screen's claim-invite copy from
`app/[locale]/admin/outreach/_parts/email-copy.ts` (move it to `lib/email-templates/` and update the one import). Existing:
`lib/email.ts` (the one email check), `lib/format.ts` (dates in both zones), `config/business.ts` (support email, address),
`components/brand/FeeBreakdown` (the three receipt lines come from `lib/fees.ts feeLines()`), `lib/ics.ts`.

## Deliverables
- `lib/email-templates/`: one module per template, eight in all: `invite`, `otp`, `claimReceived`, `claimApproved`,
  `claimRejected`, `removalConfirmed`, `bookingConfirmed`, `refund`. Each exports `subject(locale, data)`,
  `preheader(locale, data)` and `render(locale, data) -> { html, text }`. One shared layout (`layout.tsx`): 600 px single
  column table, wordmark, one-line headline, the key block (code, appointment card, or receipt lines), one button, plain-text
  details, footer with the postal address and support email from config. `dir="rtl"` on the table cells for Arabic, Arabic
  at 16 px or larger, codes and numbers isolated LTR with `<bdi>` or `dir="ltr"` spans, Western digits via `lib/format.ts`.
  Copy keys under the `email.*` namespace in `messages/*.json`; Arabic stays `needs_review`.
- `lib/email-templates/send.ts`: `sendEmail(template, locale, to, data, { idempotencyKey })` through Resend with a 10 s
  timeout, `from` from config, the idempotency key passed as Resend's header, returns `{ ok, error }`. Never called from a
  page in this lane.
- `app/[locale]/emails/[template]/page.tsx` (plus `loading.tsx`): a dev-only preview route (404 in production builds, same
  guard as the role switch) that renders each template with sample data from `lib/sample.ts`, `?view=text` for the plain
  text, so the screenshot script covers all eight in both locales.
- `tests/unit/emails/`: every template renders in both locales, subject states the content (E1), no `needs_review` leak into
  the subject, the OTP and booking code appear inside an LTR isolate, the booking email names both zones, the refund email
  mirrors the receipt lines (E3), any AI-generated line carries the label (T4).
- `scripts/email-test-send.ts`: sends all eight to one address in both locales for the Gmail and Outlook check.

## Done when (task 2.9 templates, screen 49)
- [ ] Eight templates render in both locales at 600 px; preview route screenshots clean at 390 and 1280
- [ ] Test sends arrive in Gmail and Outlook, RTL correct, no encoding issues (mark not run without the Resend key)
- [ ] Outreach screen imports the shared invite copy; no second claim-invite email exists
- [ ] Unit tests pass; `npm run check` green

## Notes
- Allowed additions: `resend` (pinned), `@react-email/components` and `@react-email/render` (pinned) if you choose React
  Email; plain TSX rendered with `renderToStaticMarkup` is also fine. Say which in the report.
- `.env.example`: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`.
