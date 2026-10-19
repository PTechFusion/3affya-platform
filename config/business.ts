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
