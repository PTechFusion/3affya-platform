# L0. Human lane (Yasir, Dr Ayman, counsel)

Nothing here is code. Each item unblocks a code lane; the lane briefs name which.

## Yasir
1. **VPS Supabase stack (task 1.3).** Supabase Docker Compose on the VPS, Postgres and Studio not on a public port, Studio
   through an SSH tunnel only. Record the external `nmap` result. Gives L1 and L6 a shared staging database; L1 does not wait
   for it (it runs the local stack).
2. **Stripe account** in Dr Ayman's name with Yasir as developer; test keys into the local `.env` only. Unblocks L2's
   `stripe trigger` verification (L2 builds without it).
3. **Resend**: verify `mail.3affya.com` (task 1.10), API key into `.env`. Unblocks L4 test sends (L4 builds without it).
4. **Anthropic HIPAA-ready organisation request** in Dr Ayman's name; record date and reference in the overview open question
   10. Until then L3 runs on a normal API key with synthetic fixtures only.
5. **Vercel project** with password protection for the next preview (task 1.11 names Vercel; Netlify works meanwhile).
6. **Five spike documents** for L3: synthetic, or Yasir's own, including one low-resolution scan, Arabic and English.

## Dr Ayman
7. **Arabic copy review** in the preview; answers go in `messages/REVIEW.md` (4,368 strings are `needs_review`).
8. **Open questions** from the screen waves (waves 3 to 5 lists: fee split on refunds, per-page AI cost vs per-GB price,
   suspension vs paid visits, admin owner for TOTP resets, review SLA, invite language, comp months).

## Counsel
9. Saudi cross-border rules and UAE data residency (research decisions 7 and 8).
10. Cold outreach to NPI-registry doctors (CAN-SPAM, NPPES terms); invite sending stays off until cleared.
11. Audit log retention and CSV export; removal record retention.
12. Formal business-associate posture (ADR-2, decided close to launch).
