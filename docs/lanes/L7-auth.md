# L7. Auth and gating — branch `lane/auth` — ADR-8, task 2.3 (account half), task 1.7 last item

**Depends on:** L1 merged (profiles, role trigger, invites table). Runs alongside L6.
**Not in this lane:** data queries (L6), email templates (L4; use `lib/email-templates/send.ts` when it exists, else a
console writer behind the same signature), TOTP enrolment UI beyond what screen 37 shows.

## Read
Architecture: ADR-8 (patients and professionals by email OTP; admin by email plus TOTP; role in `app_metadata`), Critical
flow 3 (claim: hashed token, 14-day expiry, one use). Screens 18 (`/sign-in`), 37 (`/admin/login`), 9 (`/claim/[token]`) and
their briefs. `lib/otp.ts`, `lib/viewer.ts`, `middleware.ts` (locale router; keep it the deprecated `middleware` convention,
see its header), `components/brand/PortalShell.tsx` and the three portal layouts, the role switch (`NEXT_PUBLIC_DEV_ROLE_SWITCH`).

## Deliverables
- `lib/auth/`: `session.ts` (read the Supabase session from cookies on the server, return `{ userId, role, locale, timeZone }`
  or null), `require.ts` (`requireRole("patient" | "professional" | "admin")` for layouts and actions; returns a redirect
  target or the session), `otp.ts` (send and verify email OTP through Supabase Auth; rate limited per email and IP with the
  counts in `config/business.ts`), `totp.ts` (admin second factor through Supabase MFA; the lockout rule screen 37 shows),
  `claim.ts` (token hash lookup, expiry, single use, moves the professional row to claimed in the same transaction).
- `/sign-in`, `/admin/login`, `/claim/[token]` actions made real, same `{ ok, error }` shapes and copy keys the screens use.
- Portal layouts call `requireRole`; a wrong role lands on the right portal, no session lands on sign-in with `?next=`.
  Server actions of every portal check the role again (authorisation is decided in server code and RLS, never in UI).
- Role switch: in production builds the bar and the `?role=` handling are compiled out (already) and the session is the only
  source of role; in dev builds the switch signs in as the three seeded accounts so the screenshot script keeps working.
- Sign out everywhere `PortalShell` shows it.
- `tests/e2e/auth.spec.ts`: a patient cannot open `/professional` or `/admin`; an expired or used claim token shows the
  states screen 9 defines; admin login requires the second factor; five wrong codes pause for the configured minutes.

## Done when
- [ ] Email OTP sign-in works for patient and professional against the local stack; admin needs TOTP
- [ ] Every portal route and action refuses the wrong role on the server
- [ ] Claim token: hashed at rest, 14-day expiry, dead after one use, "already claimed, sign in" on the second use
- [ ] Role switch compiled out in production; dev switch signs in as seeded accounts
- [ ] `tests/rls` and `npm run test:e2e` green; `npm run check` green

## Notes
- Allowed additions: `@supabase/ssr` (pinned). No other auth library.
- Cookies: `httpOnly`, `secure` outside dev, `sameSite=lax`. Session refresh in `middleware.ts` only if Supabase SSR needs it;
  keep the locale routing exactly as it is.
