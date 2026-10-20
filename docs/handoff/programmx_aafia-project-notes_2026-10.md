# 3affya (Aafia) project notes

Last updated: 20 October 2026 (schema lane decisions: doctors-only directory, account deletion, production sign-in; section 12). Before that 19 October 2026 (theme approved, calling research, design files added to the folder). Owner: Yasir (ProgrammX). Client: Dr Ayman Salem.

Use this file as the starting context for any new chat about 3affya.

## 1. What it is

3affya (brand spelling everywhere; domain 3affya.com, also written "Aafia") is an introduction and marketing platform for Arabic-speaking, US-trained physicians and healthcare professionals, aimed at patients across the GCC.

- Covers both video consults and in-person US visits.
- Clinical care is delivered independently by the professional; 3affya introduces, lists and handles payments and AI preparation tools.
- Doctors set their own fees. 3affya adds a platform fee plus card processing on top (draft model in the content document: 10% platform fee, processing around 3.5%).
- 3affya earns on the first visit only; patients paying doctors directly afterwards is acceptable to Dr Ayman.
- Dr Ayman is registering a US company, bank account and tax ID, and also wants an entity in Oman.

## 2. Commercial terms (agreed)

- Price: USD 10,000 total for the launch platform, including the medical records AI and 12 AI agents (agents agreed on the 15 Oct call).
- Payment plan (Dr Ayman, 15 Oct call): USD 2,500 per month in October, November, January and February. First USD 2,500 promised for 18 or 19 October.
- Original terms in the sent PDF were 50% now, 50% at completion; replaced by the instalment plan above.
- The regular monthly retainer continues separately and is not affected.
- Marketing (doctor outreach, Meta campaigns) runs as a separate monthly service from launch, priced later.
- Mobile apps not in this price.
- Scope is not frozen while Dr Ayman keeps paying (Yasir's call). Plan: launch with platform, payments, records AI and a first batch of agents; release remaining agents in batches through January and February alongside the payments.
- To do: once the first payment lands, send a short written confirmation of scope and payment plan.

## 3. Timeline

- Start: Monday 19 October 2026. Launch target: Friday 4 December 2026.

| Week | Dates | What ships |
|---|---|---|
| 1 | 19 to 23 Oct | Platform design, Dr Ayman's approval before build |
| 2 to 4 | 26 Oct to 13 Nov | Doctor directory live for professionals, outreach begins |
| 4 to 6 | 9 Nov to 27 Nov | Patient payments and medical records AI, built side by side |
| 7 | 30 Nov to 4 Dec | Testing, security review, launch Friday 4 December |

To hold 4 December: design approval by 23 Oct; US entity, EIN and bank account ready by early November so Stripe can approve payments.

## 4. Deliverables (as sent to Dr Ayman, programmx_deliverables_2026-10.pdf)

1. Platform design: brand system from the 3affya logo; Figma designs for every key screen in Arabic (RTL) and English; practice ID card; phone, tablet, desktop layouts.
2. Doctor directory platform: bilingual site from the content document; 104 specialty groups with search by specialty, language, location, visit type, age group; professional profiles; credential review with verification date; claim-your-profile flow; doctor portal (profile, fees, membership); monthly and yearly memberships; featured banner (scrolling carousel of practice ID cards, sold as add-on); admin panel.
3. Patient payment system: patient accounts, checkout, platform fee shown separately, fee breakdown and itemised receipts, refunds and cancellations, payouts to professionals, billing for memberships and banners.
4. Medical records AI: secure upload (PDF, documents, scans); Arabic and English; one-page overview and dated timeline; diagnoses, procedures, medications, allergies, results linked to source page; missing or conflicting info flagged, never invented; per GB quote before processing; encrypted storage, consent, audit log, deletion; shared only with the professional the patient chooses.
5. Launch and handover: hosting, SSL, email, analytics; testing in both languages; security review; privacy, terms, fees and refunds pages for legal review; outreach list of about 66,000 Arabic-named professionals; full handover, Dr Ayman owns all code, designs and data.

## 5. AI agents

From 3affya_Website_Content_and_AI_Platform.pdf.

Core (pages 13 to 16):
1. Medical record summary agent. Price USD 9.99 per 1 GB block of accepted input (rounded up; show quote before payment; failed retries not charged).
2. Medication comparison agent (against US references such as RxNorm; no substitution advice). Price to be announced.
3. English correspondence agent (draft, Arabic explanation, patient approves, send, audit trail). Price to be announced.

Additional tools (pages 47 to 48):
4. Bilingual document translator
5. Consultation preparation assistant
6. Missing record and readability checker
7. Duplicate and update-aware organizer
8. Guided directory search
9. Clinician instruction explainer
10. Appointment and task organizer
11. Consent-aware sharing assistant

12. Website chatbot (confirmed by Dr Ayman, 16 Oct). Dr Ayman (16 Oct evening call): the chatbot also needs to do intake, and this gives us a chance to dry run. Decision (Yasir, 16 Oct): a light intake version ships at launch: guided intake that suggests a specialty and pre-fills the introduction request, no medical advice, consent and audit log per ADR-2. The full website chatbot stays in a later batch. To make room, the 24h and 1h booking reminders and the home banner carousel move to January (banner sales therefore start with the carousel in January). Confirm with Dr Ayman in the written scope confirmation.

Build order suggested in the document (page 49): records foundation first (upload validation, OCR, duplicates, source-linked summaries, missing-record checks), then patient communication (translation, preparation packs, approved email sending), then medication support.

Pricing for tools 4 to 11 (paid, free or part of membership) still to be decided by Dr Ayman before each goes live.

## 6. Draft UI scope (16 Oct, not yet confirmed)

About 45 to 50 screens, all bilingual.

1. Public website (about 14): home, why US training, how it works, specialty directory (104 groups), search results with filters, doctor profile, featured banner carousel, AI tools (coming soon), for professionals / membership, FAQ, about, contact, legal pages.
2. Patient portal (about 12): sign up and login, request introduction, checkout with fee breakdown, receipts, records upload with quote, summary and timeline viewer, agent workspace (translator, email draft, approve and send, medication comparison), consent and sharing, reminders, settings.
3. Professional portal (about 8): profile builder (one split screen that covers claim from invite, onboarding, credential upload, profile editing and the practice ID card, with the card building live as the doctor types; see 7b), availability, membership and billing, featured banner purchase, introduction requests inbox, payouts setup, shared summaries viewer.
4. Admin panel (about 10): credential review queue, listings, specialty list, members and subscriptions, payments, refunds and payouts, banners, AI jobs and costs, outreach and invite tracking, audit log.
5. Supporting: design system from the logo; email and notification templates.

Added 16 Oct evening: intake chat on the public site (entry point to request introduction).
Changed 17 Oct: claim, onboarding, credential upload, profile editor and ID card merge into the profile builder (ikioo flow), so the professional portal drops from about 11 screens to about 8.

Suggested design order: design system, then public site and doctor profile (what doctors see during outreach), then professional portal, patient portal, admin.

Design principle (Yasir's standing rule): never leave a user staring at an empty wait; every page needs something useful to see or do while it loads, and a hook that keeps the user on the page.

## 7. Open questions

Answered by Dr Ayman on 16 Oct:
1. The 12th agent is the website chatbot.
2. Rasheed's designs were Adobe XD, not Figma. Bhaskar has been asked for the files (reference for banners and the practice ID card). Pending. On 17 Oct Yasir received 14 PNG exports of the ikioo doctor sign-up flow (ikioo_signup.zip); reviewed in 7b.
3. Keep the MedBot Pro direction (16 Oct). Superseded on 17 Oct, see item 4.

Settled 17 Oct (Yasir, from his conversations with Dr Ayman):
4. MedBot Pro is dropped as a reference. When Dr Ayman pointed to it he meant the practice ID card, which the ikioo flow already covers. The ikioo sign-up screens are Rasheed's work and are all we have from Rasheed.
5. Rasheed's Adobe XD account: Yasir has access, but opening it needs a paid plan or trial. Not needed for launch; see 7b.
6. Logo: Dr Ayman generated it with ChatGPT and sent two versions. ProgrammX can make the dark-background version itself.
7. Light intake chat at launch: Dr Ayman wants the chatbot there, so the trade (reminders and home carousel to January) stands.
8. No NFT and no blockchain on 3affya. The card is a display practice ID card on the site.
9. The cut-off call notes: Dr Ayman's point was that many US doctors only have landlines while Gulf patients use WhatsApp, and he wants a way to close that gap for consultations by call, possibly through a third-party service. This is a research item for ProgrammX, not a question for him (7a).

Needed later (early November):
- Membership prices (monthly and yearly), featured banner price (earlier mentioned USD 9.99 per month), final platform fee %, refund policy.
- Prices for the medication and email agents.
- US entity, EIN and bank account for Stripe.
- Arabic copy: AI-drafted for now; Dr Ayman corrects in preview (16 Oct).
- HIPAA / business-associate question: Dr Ayman wants it checked close to launch, not now (16 Oct). Build keeps the controls in the architecture handoff so either answer fits; target the check for 20 Nov with the security review.

Already in hand: GoDaddy access to 3affya.com (Yasir has it).

## 7a. Call notes, 16 Oct evening

Yasir's raw notes: "Chatbot also needs to do intake. This would give us a chance to dry run. 65000 people in medicare. Use AI to get more data about them and create cards for them in advance with pre seeding. Service for... A service which is cell phone to landline. If people don't use WhatsApp and they want to talk to doctors from Gulf to US. Any 3rd party service. Audience in..."

1. **Intake chatbot.** See section 5, agent 12.

2. **Enriching the ~65,000 and pre-made cards.** Decision (Yasir, 16 Oct): public data joined on NPI, AI only normalises and translates to Arabic. No AI web research, no invented bios, no scraped photos. Pre-made cards on unclaimed pages carry the "public registry, not verified" label; the full card unlocks on claim. Outreach line: "your card is already made".
   - Source: CMS Provider Data Catalog, Doctors and Clinicians National Downloadable File (data.cms.gov/provider-data, dataset mj5m-pzi6), Medicare-enrolled clinicians, free download, keyed on NPI. Fields checked 16 Oct 2026 in the CMS data dictionary: credential, medical school name, graduation year, primary and secondary specialties, group practice name and size, practice address and phone, Medicare assignment, hospital affiliations (facility affiliation file, also joined on NPI); newer releases add a telehealth flag.
   - Not in the file: board certification and residency. Medical school alone does not prove "US-trained" (many Arabic-named US doctors went to medical school abroad and trained in US residencies), so the card shows medical school and graduation year as facts, and "US-trained" is only claimed after credential review.
   - One row per clinician, enrollment and address, so dedupe on NPI. CMS says general information refreshes monthly.
   - Not every row in our 66k NPPES shortlist is Medicare-enrolled; the NPI join gives the real enriched count (Dr Ayman's 65,000 figure is his). Since 20 Oct only the 28,584 doctor rows get a page (section 12), so the join counts those.
   - No need to pay for Apify actors that resell this file; download it directly.

3. **GCC mobile to US landline calling.** Owner: Yasir. Dr Ayman's framing: many US doctors are on landlines, Gulf patients live on WhatsApp; find the best way to connect them for a consultation by call. Research done 17 Oct 2026 (night).

   **WhatsApp cannot reach a landline.** Meta's WhatsApp Business Calling terms disallow the phone network (PSTN) on any leg of a WhatsApp call, even when bridged through SIP. Infobip's docs say the same ("strictly forbidden to connect WhatsApp Business Calling to PSTN"). So a patient's WhatsApp call can only reach a doctor who answers in an app or browser, never a landline. Also: WhatsApp voice is blocked in the UAE, works in Saudi Arabia and Kuwait, and is intermittent in Qatar, Oman and Bahrain (third-party status page, Sept 2026; treat as indicative).

   **Options that work, with Twilio list rates checked 16 and 17 Oct 2026 (telephony only, 30-minute call):**
   - A. Zoom or Teams link (already in scope): patient joins in the app (both on the UAE approved list); the doctor joins from the landline using the meeting's dial-in number. Zoom advertises toll dial-in for 55+ countries at no extra charge. Cost to 3affya: nothing. Build: nothing beyond the video link field and booking instructions.
   - B. Patient dials a US number: 3affya gives each booking a US number plus a PIN; the platform forwards the call to the doctor's landline with both numbers hidden. Works from every Gulf country because it is an ordinary international call. Cost to 3affya about USD 0.67 per 30 minutes (inbound US 0.0085 + outbound US 0.014 per minute) plus USD 1.15 a month per number; the patient pays their carrier's international rate.
   - C. Callback bridge: at the booked time the platform rings the patient's own mobile and the doctor's landline and joins them. Works everywhere, patient pays nothing on their phone bill, so 3affya would charge a call fee. Cost per 30 minutes: Kuwait USD 4.32 (Viva rate), Bahrain 7.20, UAE 9.40, Saudi 9.79, Qatar 12.40, Oman 12.72. Telnyx publishes US calls from USD 0.005 per minute; its Gulf rates need a quote.
   - D. Browser call to the landline: about USD 0.54 per 30 minutes, but unlicensed VoIP is blocked or illegal in the UAE and patchy elsewhere. Not recommended as the main route.
   - E. WhatsApp call answered by the doctor in a 3affya app or browser: free for user-initiated calls; Saudi and Kuwait only; needs the doctor off the landline. Later, if doctors adopt the portal.

   **Recommendation:** launch with A (zero cost, already in scope). Add B as the first paid build (cheap, every country, reuses the booking). Offer C as a premium "we call you" option priced per call, after a Telnyx quote. Skip WhatsApp to landline: Meta's terms forbid it. Recording off by default. Twilio and Telnyx both list HIPAA support; a BAA would be needed if calls carry health information under the counsel's answer (overview Q5).
   - Scope: B and C are outside the USD 10k; re-scope with a price once Dr Ayman picks. Caller ID display for international calls into Gulf networks to be tested before launch.

## 8. Technical decisions and constraints

- Host 3affya in a new cloud account and billing account in Dr Ayman's name, fully separate from the ikioo Google Cloud project. Budget alerts and hard caps from day one, no long-lived service account keys, least-privilege access, logging on. (Background: the ikioo project had an unauthorised AI usage incident in October 2026 and its billing is disabled during Google's review.)
- AI provider for the records agent must sign a healthcare data agreement (BAA) and support spending caps. Agent AI usage billed to Dr Ayman's own account at cost, with caps.
- Payments: Stripe through the US entity can accept GCC patients' cards. Stripe does not support Oman as an account country (UAE is the only GCC country it supports), so an Oman entity cannot be the Stripe account holder. Stripe pricing checked 14 Oct 2026: 2.9% + 30c per card payment, +1.5% international cards, +1% currency conversion; Connect: USD 2 per active connected account per month, 0.25% + 25c per payout. Recheck before quoting.
- Practice ID card: Rasheed designed a practice ID card flow that was built into ikioo and MedBot Pro. Reference now: the ikioo sign-up PNGs (Rasheed's work, 17 Oct), the featured card on the theme board, and the banner ad PDF Dr Ayman sent on 14 Oct.
- Visual direction (17 Oct): theme draft 1 from the 3affya logo (7b), with the ikioo sign-up flow for doctor onboarding and the practice ID card. MedBot Pro dropped. No Figma pass; designs are delivered as a clickable prototype plus an in-app brand system (see the handoff files).
- Directory enrichment: CMS Doctors and Clinicians join on NPI added to the seed step (task 1.5); see section 7a. The directory lists doctors only (20 Oct, section 12).
- Planning: full handoff written 16 Oct. Files: programmx_handoff-overview, -architecture, -milestones, -tasks (all 2026-10), in this folder and in the Claude Project. Start there for any build question. Overview, milestones and tasks carry the 16 Oct evening changes and the 17 Oct profile builder decision.

## 9. Files in this folder

- `Initial Brief.txt`: original call notes / brief.
- `3affya_Website_Content_and_AI_Platform.pdf`: Dr Ayman's bilingual content master and AI platform blueprint (website copy, membership, payments, AI agents, build plan). Main source for copy and agents.
- `3affya Logo With Elegant Arabic Tagline.png` (and copy), `3affya logo in sea glass and gold.png`: brand logos.
- `programmx_deliverables_2026-10.pdf`: the USD 10k deliverables sent to Dr Ayman on 14 Oct. Current.
- `programmx_proposal_2026-10.pdf`: older USD 15k phased proposal. Outdated, do not send.
- `ListPhysiciansEmailsOnly-.csv`, `physician-fax-numbers_4.16.18.csv`: doctor lists supplied by Dr Ayman (2018 era).
- `NPPES_Data_Dissemination_October_2026_V2.zip`: October 2026 national provider registry download.
- `scripts/aafia_name_filter.py`: scores names for likely Arabic origin.
- `scripts/aafia_build_master.py`: merges Dr Ayman's lists into one scored master.
- `scripts/aafia_nppes_refresh.py`: streams the NPPES zip in chunks (pass1 per chunk, then finalize), scores all individual providers and matches old emails.
- `output/aafia_master_doctors.csv`, `output/aafia_scored_all.csv`, `output/aafia_shortlist.xlsx`: results from Dr Ayman's original lists.
- `output/nppes_2026-10/aafia_registry_shortlist_2026-10.xlsx`: refreshed outreach list, about 66,000 Arabic-named professionals with current practice addresses, emails matched where available. Main outreach source. The directory imports only its three doctor sheets ("Physicians High", "Physicians Medium", "Dentists": 28,584 rows, 20 Oct).
- `output/nppes_2026-10/_slim_*.csv`, `_counts_*.pkl`, `_nppes_individuals_slim.csv`: temporary processing files (about 1 GB), safe to delete.
- `design/README.md`: what is in the design folder.
- `design/theme-board/`: source of the theme board Dr Ayman approved on 17 Oct (canvas.json plus five .dc.html artboards).
- `design/logos/`: transparent logo cut-outs (English tagline, Arabic tagline, wordmark only).
- `design/references/`: Dr Ayman's beach photo (colour source) and Rasheed's 14 ikioo sign-up screens (profile builder reference).

## 10. Next steps

1. Done 17 Oct: theme board approved by Dr Ayman. Build the brand system from it on Monday (task 1.2).
2. Confirm the UI scope (section 6) and turn it into a screen inventory.
3. Design system, then first mockups (public site and doctor profile) for approval by 23 Oct.
4. When the first USD 2,500 lands, confirm scope and payment plan in writing, including the light-intake trade.
5. Set up the separate cloud account and billing for 3affya before build starts.
6. Download the CMS Doctors and Clinicians file and run the NPI join against the shortlist's 28,584 doctor rows (doctors only since 20 Oct); report the matched count. The join script is built (task 1.5, `scripts/enrich_cms.py`, report in `output/cms_join_report.md`).
7. Make the transparent and dark-background logo versions from Dr Ayman's two ChatGPT versions.
8. Calling: research done 17 Oct (7a). Next: send Dr Ayman the options; get a Telnyx Gulf quote if he wants the callback bridge.
9. Price options B and C as a re-scope once Dr Ayman picks.

## 11. Added 19 to 20 Oct (evening session)

- `programmx_aafia-screen-rules_2026-10.pdf` and `.md`: 156 evidence-backed screen rules from four research lanes (general UX, healthcare, Arabic and Gulf, marketplace), ten decisions the research forces, pointers and a layout call for every screen.
- `programmx_aafia-screen-inventory_2026-10.xlsx` draft 2: columns L (Design pointers), M (Rule refs), N (Layout call) and a Rules sheet.
- `design/brand-page/`: screenshots of /brand as built (phone ar and en, desktop ar).
- Repo: https://github.com/PTechFusion/3affya-platform (tasks 1.1 and 1.2 done; 50 screen briefs under docs/screens; CLAUDE.md for Claude Code). How to begin: `programmx_aafia-repo-readme_2026-10.md`.
- Open with counsel (from the research): Saudi cross-border consult rules (supervision, video, signed consent); UAE health data residency and DHA per-session consent. On the 26 Oct checkpoint agenda.

## 12. Decided 20 Oct (Yasir, after the schema lane)

The schema lane (L1, PR #4 into dev: tasks 1.4 and 1.5) asked eight questions; Yasir's answers:

1. Taxonomy: every large group maps to its most logical card (for example general practice to family medicine, haematology and oncology to oncology). 402 of the 589 codes are mapped; students, support roles and professions no card covers stay unmapped. On doctor rows, every code that has a card is mapped.
2. Specialty names: all 104 groups use the content document's card titles in Arabic and English; the 24 prototype slugs stay (they are URLs). Body systems for the 80 new groups are still open.
3. Directory: only doctors get a card and a profile: physicians and dentists, the sheets "Physicians High", "Physicians Medium" and "Dentists": 28,584 doctors (the three doctor sheets hold 28,587 rows; 3 of them are denturists, who are not doctors). Students and other professions (the "Other Professions" sheet, 37,398 rows) are not imported. Doctors practising abroad do get a profile.
4. Account deletion: a deleted professional account archives the listing (hidden from every public view; the row, bookings, credentials and history stay). A deleted patient account keeps every booking, receipt and refund line, without the patient's name or phone.
5. Production sign-in by email code only: email autoconfirm off, password sign-up and password sign-in blocked at the reverse proxy, and a smoke check that proves it.
6. The database functions for audit writes in the same transaction are not built now; they go into the data-wiring lane's plan (L6) as a prerequisite.
7. The secret grep in the lane rules uses word boundaries (the old one matched column names).
8. The gaps are built now: an `introduction_requests` table (unpaid requests and the intake chat transcript) and a busy-times function for slot pickers. Every project document updated the same day, and each other lane's brief carries its notes.
