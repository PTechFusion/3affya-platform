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

/* ---------------- Members and subscriptions, admin (screen 42, tasks 3.5 and 3.11) ---------------- */
// Appended block. What an admin can grant from /admin/members. The grace period itself is business.membershipGraceDays above;
// an extension adds graceExtendDays to it for one membership (3affya's own setting: Stripe keeps retrying the card meanwhile).
// Free months are a 100% discount on that many renewals, applied in Stripe Billing. (default until Dr Ayman confirms)
export const membershipAdmin = {
  compMonthsOptions: [1, 2, 3] as readonly number[],
  graceExtendDays: 7,
} as const;
