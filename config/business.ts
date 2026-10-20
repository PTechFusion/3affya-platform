// Every business number lives here. Never inline a price, fee, grace period or retention period in a component.
// Values marked (default until Q-n) wait on an open question in docs/handoff/programmx_handoff-overview_2026-10.md.

export const business = {
  currencyPresentment: "USD" as const, // patient-facing presentment currency; local currencies per rule P14 come with task 3.2
  firstVisitPlatformFeePct: 20, // (default until Q8)
  cardProcessingPct: 2.9,
  cardProcessingFixedCents: 30,
  // Search filters (screen 5, task 2.1). Price bands are on the all-in first-visit total (rule C5), in minor units; the
  // availability windows are in hours, 72 first (rule S7: half of new patients book within 72 hours).
  searchPriceBandsCents: [20000, 25000, 30000] as readonly number[],
  searchAvailableWithinHours: [72, 720] as readonly number[],
  slotHoldMinutes: 10,
  // Availability (screen 30, task 2.6). Slot length is the first-visit length the doctor offers, 30 minutes by default; lead
  // time is the minimum notice before a patient can book, 2 hours by default (rule P8); the horizon is how far ahead exceptions
  // can be set and patients can book.
  slotLengthMinutesDefault: 30,
  slotLengthMinutesOptions: [15, 20, 30, 45, 60] as readonly number[],
  leadTimeHoursDefault: 2,
  leadTimeHoursOptions: [1, 2, 4, 12, 24, 48] as readonly number[],
  bookingHorizonDays: 90, // (default until Dr Ayman confirms)
  fullRefundCutoffHours: 24, // (default until Q8) full refund when the patient cancels more than this many hours before the visit, none after
  recordsBlockGb: 1,
  recordsBlockPriceCents: 999,
  shareDefaultDays: 30, // (default until Q13)
  membershipGraceDays: 7, // (default until Q8)
  // Memberships and the banner add-on (task 3.5), shown on /for-professionals and in the portal. Doctors pay in USD.
  membershipCurrency: "USD" as const,
  membershipMonthlyCents: 4900, // (default until Q8)
  membershipYearlyCents: 49000, // (default until Q8)
  bannerMonthlyCents: 999, // (default until Q8; USD 9.99 per month as earlier mentioned)
  membershipPricesConfirmed: false as boolean, // (default until Q8) while false, pages say the prices are placeholders
  removalSlaHours: 48,
  inviteRateLimitPerIpPerHour: 10,
  otpDigits: 6,
  verifiedReverifyMonths: 12,
  specialtyCountShowMin: 5, // (default until Dr Ayman confirms) a specialty shows its verified-doctor count from this many up (rule H6); fewer reads "Open for booking"
  intakeMaxTurns: 20,
  // Profile builder (screen 29, tasks 2.4 and 2.5): expertise tags and upload limits.
  expertiseTagsMax: 10,
  expertiseTagMaxChars: 30,
  credentialMaxMb: 20, // PDF or image, per file (task 2.4)
  photoMaxMb: 10, // (default until Dr Ayman confirms) profile photo, JPG or PNG
  defaultTimeZone: "Asia/Riyadh",
  supportWhatsApp: "", // set in env for production
  supportEmail: "hello@3affya.com",
  supportOpenHour: 9, // support desk hours, local to defaultTimeZone, Sunday to Thursday (default until Dr Ayman confirms)
  supportCloseHour: 21,
  supportReplyWorkingDays: 1, // reply promise on the contact form (default until Dr Ayman confirms)
  emergencyNumbers: {
    SA: "997", AE: "998", KW: "112", QA: "999", OM: "9999", BH: "999", US: "911",
  } as Record<string, string>,
  weekend: {
    SA: ["fri", "sat"], KW: ["fri", "sat"], QA: ["fri", "sat"], OM: ["fri", "sat"], BH: ["fri", "sat"], AE: ["sat", "sun"], US: ["sat", "sun"],
  } as Record<string, string[]>,
} as const;

/* ---------------- Patient sign-in (screen 18, task 3.6) ---------------- */
// Email one-time code limits for the patient sign-in. The code length is business.otpDigits. Production enforces these in the
// database per email address and per IP (so they hold across instances), and answers the same whether or not an account exists
// for the address (rule F6). (default until Dr Ayman confirms)
export const signInLimits = {
  codeValidMinutes: 10, // a code works this long after it is sent
  resendAfterSeconds: 60, // the resend timer on the code step
  codesPerHour: 5, // codes one address can ask for in an hour; past it the page says when to try again (rule F5)
  wrongCodesMax: 5, // wrong codes in a row before the code stops working
  lockMinutes: 15, // wait after either limit, before a new code can be sent
} as const;

/* ---------------- Patient settings: deletion, retention and export (screen 28, task 3.6) ---------------- */
// Appended block. What /patient/settings says is removed, what is kept and for how long (rule T8), and the wait before an
// account deletion runs (rule B10: Keep my account undoes it until then). Counsel confirms the retention periods per country
// before launch; the privacy page (legal.privacy.sections.keep) must then say the same numbers.
export const accountData = {
  deletionGraceDays: 14, // (default until Dr Ayman confirms) a deletion request waits this long, then the job deletes the account
  paymentRecordsKeepYears: 7, // (default until counsel confirms) bookings, receipts and refunds kept after deletion for tax and accounting
  backupRollOffDays: 30, // nightly encrypted backups are replaced after this many days (architecture file, operations checklist)
  exportAvailableDays: 7, // (default until Dr Ayman confirms) how long a prepared download of the patient's data stays available
} as const;

/* ---------------- Sharing and consent (screen 27, task 3.10) ---------------- */
// Appended block. How long a patient can share their records summary with one doctor, in days, shortest first. The preselected
// choice is business.shareDefaultDays, which must be one of these. (default until Q13)
export const shareLengthDaysOptions = [7, 14, 30] as readonly number[];

/* ---------------- Records upload and processing (screens 24 and 25, tasks 3.7 and 3.8) ---------------- */
// The per-GB price is business.recordsBlockGb and business.recordsBlockPriceCents above. Sizes are SI units (1 GB is 1,000 MB),
// as phones show them.
export const recordsLimits = {
  maxFileMb: 50, // per file (task 3.7)
  maxSetGb: 2, // per record set (task 3.7)
  // Wall-clock estimate on the progress page (rules L1, T11): seconds per page with extraction running four pages at a time,
  // plus the dedupe, summary, flag, store and notify tail. (default until the M1 extraction spike measures latency)
  estimateSecondsPerPage: 6,
  estimateTailSeconds: 90,
  // Where records are stored and where the AI reads them, for the line beside the AI consent (rule T3). Storage stays null
  // until the production server is chosen (overview Q4) and UAE residency is settled (rule Q3); the page then says the country
  // is confirmed before launch. The AI country is the Anthropic API's (ADR-3; a Bedrock fallback region must match).
  storageCountry: null as "US" | "AE" | "SA" | null, // (default until Q3 and overview Q4)
  aiCountry: "US" as "US" | "AE" | "SA",
} as const;

/* ---------------- Booking: slot picker and checkout (screens 19 and 20, task 3.2) ---------------- */
// Appended block. The hold length is business.slotHoldMinutes and the lead time business.leadTimeHoursDefault, above.
export const bookingRules = {
  /** The age groups asked before the hold (rule P8), with their bounds in whole years; null is no upper bound. A doctor who
   *  sees "children" sees every group below `adultFromYears`; one who sees "adults" sees from it up. */
  ageGroups: [
    { id: "baby", fromYears: 0, toYears: 1 },
    { id: "child", fromYears: 2, toYears: 12 },
    { id: "teen", fromYears: 13, toYears: 17 },
    { id: "adult", fromYears: 18, toYears: null },
  ] as ReadonlyArray<{ id: "baby" | "child" | "teen" | "adult"; fromYears: number; toYears: number | null }>,
  adultFromYears: 18,
  /** The checkout hold bar turns amber, and screen readers hear it, once this many minutes are left. */
  holdWarnMinutes: 2,
} as const;

/* ---------------- Admin sign-in (screen 37, task 2.8) ---------------- */
// Appended block. Three factors in a row: work email, a code emailed to it (business.otpDigits long), then the code from an
// authenticator app (TOTP, RFC 6238) or one recovery code. No TOTP, no access: there is no route in without the third step.
// A refusal never says which factor failed (rule F6); failures count per email address and per IP in the database, whether
// or not the address belongs to a team account, and past attemptsMax sign-in pauses for lockMinutes. (default until Dr Ayman confirms)
export const adminSignIn = {
  emailCodeValidMinutes: 10, // the emailed code works this long after it is sent
  resendAfterSeconds: 60, // the resend timer on the email-code step
  totpDigits: 6, // authenticator code length (RFC 6238 default; every common app uses it)
  totpPeriodSeconds: 30, // the authenticator code changes this often
  recoveryCodeChars: 10, // letters and numbers per recovery code, shown in groups of five
  attemptsMax: 5, // refused sign-ins in a row before sign-in pauses
  lockMinutes: 30, // the pause, after which a new attempt may start
} as const;

/* ---------------- Outreach and invites (screen 46, tasks 2.3 and 4.5) ---------------- */
// Appended block. Invites go one doctor, one address, one email at a time, each sent by Resend from an Inngest job; there is
// no bulk sending and no fax (out of scope). Claim-link opens per connection are business.inviteRateLimitPerIpPerHour above.
export const outreach = {
  // (default until counsel clears sending) While false, Send and Resend are off on /admin/outreach AND the server actions
  // refuse them, so flipping this one value is the switch. Revoke stays on: it sends nothing.
  sendingCleared: false as boolean,
  inviteValidDays: 14, // a claim link works once, for this many days after it is sent (task 2.3)
  personalLineMaxChars: 300, // (default until Dr Ayman confirms) the optional note at the top of the invite email
} as const;

/* ---------------- Removal requests (screen 41, task 2.8) ---------------- */
// Appended block. The promise to the doctor is business.removalSlaHours (48) from the request; the admin queue's timer turns
// amber once a request is this many hours old and red once the promise is missed. (default until Dr Ayman confirms)
export const removalRules = {
  slaWarnAfterHours: 36,
} as const;

/* ---------------- Members and subscriptions, admin (screen 42, tasks 3.5 and 3.11) ---------------- */
// Appended block. What an admin can grant from /admin/members. The grace period itself is business.membershipGraceDays above;
// an extension adds graceExtendDays to it for one membership (3affya's own setting: Stripe keeps retrying the card meanwhile).
// Free months are a 100% discount on that many renewals, applied in Stripe Billing. (default until Dr Ayman confirms)
export const membershipAdmin = {
  compMonthsOptions: [1, 2, 3] as readonly number[],
  graceExtendDays: 7,
} as const;

/* ---------------- Credential review queue (screen 38, task 2.8) ---------------- */
// Appended block. How long a submitted claim may wait for an admin decision, counted from the doctor's latest submission
// (a resubmission restarts the clock), and how many hours before that the queue badge turns amber. The re-verification
// cycle after approval is business.verifiedReverifyMonths above (rule A2). (default until Dr Ayman confirms)
export const credentialReview = {
  slaHours: 48,
  dueSoonHours: 24,
} as const;

/* ---------------- Admin payments, refunds and payouts (screen 43, task 3.11) ---------------- */
// Appended block. The period filter of the admin money tables, in days back from today, shortest first; no choice is all time.
// The refund rule itself is business.fullRefundCutoffHours above (lib/refunds.ts).
export const adminMoney = {
  periodDaysOptions: [7, 30, 90] as readonly number[],
} as const;

/* ---------------- Admin listings (screen 39, task 2.8) ---------------- */
// Appended block. Re-verification (rule A2): the next check is the licence expiry or the yearly cycle
// (business.verifiedReverifyMonths after the verified-on date), whichever comes first.
export const listingRules = {
  reverifyDueSoonDays: 30, // (default until Dr Ayman confirms) the listings table flags a verified row this many days before its next check
} as const;

/* ---------------- AI jobs and costs (screen 45, tasks 1.9, 3.8 and 3.11) ---------------- */
// Appended block. What the admin AI jobs page measures the records pipeline against. The AI vendor bills in USD, so costs are
// in USD whatever the patient paid in. A "day" for the alert is a calendar day in business.defaultTimeZone.
export const aiLimits = {
  costCurrency: "USD" as const,
  dailySpendAlertCents: 1000, // (default until Dr Ayman confirms) the day's ai_calls cost that emails the ops inbox (architecture: daily AI spend alert)
  jobTokenCap: 3_000_000, // (default until the M1 extraction spike measures tokens per page) per-job token cap, enforced in lib/ai (task 1.9)
  attemptsPerCall: 3, // task 3.8: three attempts per page or call, then the job fails with a reason
} as const;
