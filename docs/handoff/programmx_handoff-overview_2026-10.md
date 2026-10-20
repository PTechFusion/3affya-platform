# 3affya Launch Platform: Handoff Overview
`Confidential`

**Client:** Dr Ayman Salem (3affya.com) · **Prepared by:** Yasir, ProgrammX · **Date:** 2026-10-16 (updated 17 Oct: evening call changes and the profile builder; 20 Oct: doctors-only directory and the schema-lane decisions) · **Companion files:** architecture, milestones, tasks (same date stamp)

## The goal

Dr Ayman wants a live, bilingual (Arabic RTL and English) platform on 3affya.com by Friday 4 December 2026 where a patient anywhere in the GCC can find an Arabic-speaking, US-trained clinician, book a first visit (video or in-person in the US), pay 3affya once for that introduction, and get AI help turning a pile of scanned medical records into a one-page summary and timeline the clinician can use. 3affya earns a platform fee on the first visit only; clinical care is the professional's own business. The platform also has to work as an outreach engine: the 28,584 Arabic-named US doctors (physicians and dentists) in the 66k registry shortlist already have an unclaimed page waiting for them, and claiming it is the top of the funnel.

## Success looks like

- On 4 December a GCC patient can open 3affya.com in Arabic, filter 104 specialty groups, open a claimed and verified doctor's profile, pick a slot in their own timezone, pay by card with the platform fee shown separately, receive a receipt and an .ics, and the doctor receives the booking with the patient's shared summary.
- A patient can upload PDFs and scans, see a per-GB quote before paying, and get a summary and dated timeline where every diagnosis, procedure, medication, allergy and result links back to its source page, with missing or conflicting information flagged and never invented.
- An invited doctor can claim their pre-seeded page, upload credentials, set fees and availability, pass admin review, and go live without talking to anyone.
- Dr Ayman can review credentials, see payments, refunds, AI jobs and costs, and sees nothing he cannot explain on a call.
- Everything runs in accounts and on infrastructure that Dr Ayman owns at handover, with ProgrammX holding operations under the retainer.

## In scope (launch build, USD 10,000)

1. **Brand system and prototype.** Tokens, type scale and components built from the 3affya logo, living in the app at `/brand`; a deployed clickable prototype approved by Dr Ayman by 23 October. Visual direction approved by Dr Ayman 17 Oct (theme draft 3), built from the 3affya logo and his beach photo (palette, Readex Pro type, card states, builder, hero options) on the "3affya Theme Board" design canvas; the ikioo sign-up screens (Rasheed's work, received 17 Oct) are the reference for doctor onboarding and the practice ID card, not for colours or type. MedBot Pro dropped as a reference. No Figma pass.
2. **Doctor directory.** Public site in both languages; 104 specialty groups; search by specialty, language, location, visit type and age group; 28,584 pre-seeded unclaimed doctor profiles (physicians and dentists from the 66k shortlist; students and other professions get no profile, 20 Oct) labelled as public-registry listings with "invite this doctor" and "this is me / remove me" flows; unclaimed profiles enriched from the CMS Doctors and Clinicians file joined on NPI (medical school, graduation year, specialties, group practice, hospital affiliations) with a pre-made card carrying the registry label; claimed profiles with full card and booking; credential review with verification date; invite token and claim flow; a profile builder modelled on the ikioo sign-up flow (form on one side, the doctor's card building live on the other, coach marks per step, opening pre-filled from the registry, Arabic and English preview, a publish checklist ending in admin review, up to 10 text expertise tags) that covers onboarding, credential upload, profile editing and the practice ID card in one screen; rest of the professional portal (availability, video link, membership, banner purchase, introduction inbox, payouts link); monthly and yearly memberships and a featured banner add-on through Stripe Billing; admin panel. The scrolling practice ID card carousel moves to January (change log, 16 Oct).
3. **Booking and payments.** Weekly availability and exceptions in the professional's timezone; server-generated slots; 10-minute slot hold tied to the payment; Stripe Connect Express accounts with destination charges; platform fee shown separately; itemised receipts; refunds and cancellations; payouts through Stripe; memberships and banner billing through Stripe Billing and the hosted Customer Portal. The 24h and 1h reminders move to January (change log, 16 Oct).
4. **Medical records AI (agents 1, 6, 7).** Secure upload of PDFs, documents and scans in Arabic and English; validation; per-GB quote shown before payment (USD 9.99 per 1 GB block of accepted input, rounded up, failed retries not charged); extraction with page references; duplicate and update-aware organiser; missing-record and readability checker; one-page overview and dated timeline; consent, audit log, deletion; sharing only with the professional the patient chooses.
5. **Launch and handover.** Production server in Dr Ayman's name, hardened; SSL, email, analytics; bilingual QA; security review; privacy, terms, fees and refund pages in both languages for his legal review; runbook; handover of code, designs and data; the 66k outreach list and the invite email template.
6. **Light intake chat (launch version of agent 12).** Guided intake on the public site in both languages that suggests a specialty and pre-fills the introduction request; no medical advice; consent and audit log per ADR-2. Dr Ayman's dry run of the agents before the January batches.

## Explicitly OUT of scope

- Mobile apps.
- Hosted video; the professional supplies their own meeting link.
- Calling bridge from GCC phones to US landlines (16 Oct request). Logged in the change log; re-scope with a price once Dr Ayman picks the model.
- Sending the fax and email outreach. The platform delivers the claim flow, invite tokens and templates. Sending waits on US counsel's read of the Junk Fax Prevention Act and CAN-SPAM, a vendor spike with rates checked at that time, and the monthly marketing service.
- AI agents 2, 3, 4, 5, 8, 9, 10 and 11, and the full website chatbot (agent 12 beyond the light intake). These ship in January and February batches alongside payments three and four, scoped at the January checkpoint. Pricing of each (paid, free or in membership) is Dr Ayman's call before each goes live.
- AI web research to write bios or find photos for unclaimed profiles; enrichment uses public CMS data only.
- From the ikioo flow (17 Oct): the 3-peer-invite publishing gate, ikioo coins and fixed-price services, the paid ask-a-question service, NFT minting of the doctor card, facial recognition claims on the photo step, and media on expertise tags (January). Admin credential review is the publishing gate.
- Custom UI for Stripe onboarding, payout dashboards, invoices or card management; Stripe hosts these.
- Medication substitution advice of any kind, in any agent.
- Any clinical workflow after the first visit.
- A formal HIPAA business-associate posture at launch (see open question 5); the build uses the controls listed in the architecture file and upgrades if counsel requires it.
- Entities, banking, tax or Oman company setup; Dr Ayman's side.
- Human Arabic copywriting. Arabic copy is AI-drafted from the content document; Dr Ayman corrects it in preview (his call, 16 Oct).

## Acceptance criteria (client sign-off)

- **Prototype approval (M1)**
  - Given the prototype URL in Arabic, When Dr Ayman opens the home page, directory, a doctor profile and each portal shell on phone and desktop, Then layout is right-to-left with mirrored navigation, no clipped text, and the brand tokens from `/brand` are used throughout.
  - Given the same URL in English, When he switches language, Then every visible string changes and the layout flips to left-to-right with no mixed-direction lines.
- **Directory (M2)**
  - Given a patient on the Arabic site, When she filters by specialty "Neurosurgery", language "Arabic", visit type "video", Then only claimed-and-verified professionals matching all three appear, ordered with featured first, and the result count matches a database query with the same filters.
  - Given an unclaimed profile, When anyone opens it via the site or the API, Then no fee, no availability, no checkout and no contact details appear; the page shows the public-registry label, "invite this doctor" and "this is me / remove me".
  - Given a doctor submits "remove me", When admin confirms, Then the page returns 410 within 48 hours and is removed from the sitemap.
- **Claim and review (M2)**
  - Given a valid invite token, When the doctor opens it, Then they land on their own pre-filled page; an expired or used token shows a clear message and a way to request a new one.
  - Given a submitted claim with credential uploads, When admin approves, Then the profile shows "verified" with the review date and becomes bookable; when admin rejects with a reason, the doctor sees the reason and can resubmit.
  - Given a doctor opens the profile builder from their invite, When it loads, Then registry fields (name, specialty, city and state, and medical school and graduation year where the CMS file has them) are pre-filled, and every edit on the form shows on the card preview within one second without a page reload.
  - Given the builder in English, When the doctor switches the preview to Arabic, Then the card renders right to left with the Arabic name and bio, or a clear "add Arabic name" prompt where missing.
  - Given certifications uploaded but not yet approved, When the doctor or anyone else views the card, Then certifications show as "pending verification" and nothing is listed publicly until admin approves.
  - Given a phone-width screen, When the builder opens, Then the card shows as a sticky mini preview above the form and nothing overflows sideways.
- **Booking and payment (M3)**
  - Given a professional in America/Chicago with availability Tuesday 9:00 to 12:00, When a patient in Asia/Riyadh views Tuesday 3 November 2026, Then the slots render as 18:00 to 21:00 Riyadh time, and after the US DST change on 1 November 2026 the same rule renders correctly on both sides.
  - Given a patient selects a slot, When checkout opens, Then the slot is held for 10 minutes, the doctor's fee, 3affya's platform fee and card processing are shown as separate lines, and the total equals the Stripe PaymentIntent amount to the cent.
  - Given the hold expires without payment, When the patient tries to pay, Then payment is refused, the slot is free again for others, and no charge exists in Stripe.
  - Given a successful payment, When Stripe's webhook arrives twice, Then exactly one booking, one receipt and one professional notification exist.
  - Given a refund issued by admin, When Stripe confirms, Then the booking shows refunded, the receipt shows the refund line, and the professional's pending payout is reduced by their share.
- **Records AI (M3)**
  - Given 1.3 GB of accepted uploads, When the patient asks for a summary, Then the quote shows USD 19.98 (two 1 GB blocks) before any charge, and processing does not start until payment succeeds.
  - Given a processed record set, When the patient opens the summary, Then every diagnosis, procedure, medication, allergy and result has a link that opens the exact source page, and items the documents do not support are absent.
  - Given two documents that are the same report scanned twice, When processed, Then one entry appears with both sources listed.
  - Given a scan too blurry to read, When processed, Then the item is flagged "unreadable" with the page reference instead of guessed content.
  - Given processing fails on page 7 of 30 after retries, When the patient checks, Then the job shows failed with a plain reason, no charge was captured, and a retry does not create a second quote.
  - Given patient A's record, When patient B requests it by ID, Then the response is 404 and an audit row is written.
  - Given the patient deletes a record set, When deletion completes, Then files, extracted data, summary and share links are gone and the audit log keeps only the event, not the content.
- **Memberships and banner (M3)**
  - Given a professional on a monthly membership, When the renewal fails, Then Stripe's dunning runs, the profile stays live for the grace period in settings, and admin sees the status.
  - Given a banner purchase, When paid, Then the practice ID card appears in the home carousel within one minute. (Moves to January with the carousel; see change log.)
- **Launch (M4)**
  - Given the production server, When the hardening checklist in the architecture file is run, Then every item passes and the output is attached to the handover.
  - Given last night's backup, When restored to a fresh instance, Then the app starts and a known booking is present.
  - Given both languages, When the QA script is run, Then zero blocking defects remain.

## Open questions

| # | Question | Owner | Needed by |
|---|----------|-------|-----------|
| 1 | Closed 16 Oct: the 12th agent is the website chatbot | Dr Ayman | done |
| 2 | Closed 17 Oct: the ikioo sign-up PNGs are Rasheed's designs and cover the ID card concept. Opening his XD file needs a paid plan or trial; optional, only if it holds ID card or banner artboards not in the PNGs | Yasir | optional |
| 3 | Closed 17 Oct: MedBot Pro dropped; Dr Ayman meant the practice ID card, covered by the ikioo flow. Theme comes from the logo | Yasir | done |
| 4 | Production server: provider and account in Dr Ayman's name | Dr Ayman decides, Yasir sets up | 20 Nov |
| 5 | US counsel: are the launch PHI controls adequate, or must 3affya adopt a formal business-associate posture? Dr Ayman chose (16 Oct) to check close to launch; the build keeps the ADR-2 controls so either answer fits | Dr Ayman's US lawyer | 20 Nov, with the security review |
| 6 | US counsel: compliant shape for fax and email outreach | Dr Ayman's US lawyer | before any send |
| 7 | US entity, EIN and bank account for Stripe live mode | Dr Ayman | 7 Nov |
| 8 | Membership prices, banner price, final platform fee %, refund policy | Dr Ayman | 7 Nov |
| 9 | Closed 16 Oct: Arabic copy is AI-drafted for now; Dr Ayman corrects in preview | Dr Ayman | rolling, in preview |
| 10 | Anthropic HIPAA-ready API organisation provisioned? If not by 14 Nov, switch to Bedrock per ADR-3 | Anthropic sales, Yasir | 14 Nov |
| 11 | Written scope and payment-plan confirmation, restating the design deliverable as prototype plus brand system, and the light-intake trade | Yasir | on receipt of first USD 2,500 |
| 12 | Payout schedule and whether the professional or 3affya absorbs Stripe Connect fees | Dr Ayman | 7 Nov |
| 13 | Records retention default after a visit (keep until patient deletes, or auto-purge after N days) | Dr Ayman | 7 Nov |
| 14 | Closed 17 Oct: the cut-off notes were Dr Ayman's landline gap (US doctors on landlines, Gulf patients on WhatsApp); folded into Q15 | Yasir | done |
| 15 | Calling: research done 17 Oct (project notes 7a). WhatsApp to landline is forbidden by Meta's terms. Recommended: launch on Zoom or Teams links (doctor dials in from landline), then a US dial-in number with PIN forwarded to the landline, then an optional paid callback bridge. Dr Ayman to pick | Dr Ayman | before re-scope |
| 16 | Closed 17 Oct: Dr Ayman wants the intake chat at launch; reminders and banner carousel move to January | Dr Ayman | done |
| 17 | Closed 17 Oct: no NFT and no blockchain; the card is a display practice ID card | Yasir | done |
| 18 | Closed 17 Oct: Dr Ayman approved theme draft 3 (lagoon hero, sand and lagoon practice card, "US-Trained Arabic-Speaking Doctors" headline); transparent logo files made | Dr Ayman | done |

## Change log

| Date | Request | Resolution (in-appetite scope trade / re-scope / declined) |
|------|---------|------------------------------------------------------------|
| 2026-10-15 | 12 AI agents inside the USD 10k | Accepted: agents 1, 6, 7 at launch; the rest in Jan and Feb batches with payments three and four |
| 2026-10-16 | 3affya owns the calendar (not in the deliverables PDF) | Accepted as slots plus the doctor's own video link; hosted video declined; custom Stripe UI traded to hosted pages to make room |
| 2026-10-16 | Chatbot (agent 12) does intake at launch, as a dry run | In-appetite trade: light intake ships at launch (specialty suggestion, pre-filled introduction request, no medical advice); 24h and 1h reminders and the home banner carousel move to January. Full chatbot stays in a later batch. Confirmed by Dr Ayman 17 Oct |
| 2026-10-16 | Enrich the ~65,000 Medicare doctors with AI and pre-make their cards | Accepted in appetite: CMS Doctors and Clinicians file joined on NPI in the seed step; AI normalises and translates only; pre-made cards on unclaimed pages carry the registry label. AI web research declined (accuracy risk on real named doctors) |
| 2026-10-16 | Third-party service so GCC patients can call US doctors' landlines without WhatsApp | Not absorbed. Outside the USD 10k; options and current rates in the project notes (section 7a); re-scope with a price once Dr Ayman answers Q15 |
| 2026-10-17 | Theme: lagoon water hero, two-sided practice card (sand front with name, lagoon back with details), beach-photo sand, bigger headline and logo | Accepted in appetite; approved by Dr Ayman 17 Oct. Practice card flip is a small addition to the existing card component |
| 2026-10-17 | Use the ikioo doctor sign-up flow as the reference for 3affya onboarding | Accepted in appetite: claim, onboarding, credential upload, profile editor and ID card merge into one profile builder with a live card preview (fewer screens, not more). Peer-invite gate, coins, ask-a-question and NFT left out (Dr Ayman confirmed no blockchain, 17 Oct); expertise tag media to January. Review in the project notes (7b) |
| 2026-10-20 | Directory scope after the schema lane: who gets an unclaimed page, and the specialty names (Yasir) | Decided, in appetite: only doctors are listed (physicians and dentists, 28,584 rows of the shortlist); students and other professions get no card and no profile; doctors practising abroad are listed. Every large taxonomy group maps to its most logical card. All 104 groups use the content document's card titles; the 24 prototype slugs stay. Body systems for the 80 new groups still open |
| 2026-10-20 | Account deletion, production sign-in, introduction requests (Yasir) | Decided, in appetite: a deleted professional account archives the listing (hidden from every public view, records kept); a deleted patient account keeps every booking, receipt and refund line without name or phone. Production signs in by email code only (password sign-up and sign-in blocked at the proxy). Introduction requests and the intake transcript get their own table, and slot pickers read busy times from the database. Architecture Data section and tasks updated the same day |

---
ProgrammX · programmx.com · hello@programmx.com
