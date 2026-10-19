// Every business number lives here. Never inline a price, fee, grace period or retention period in a component.
// Values marked (default until Q-n) wait on an open question in docs/handoff/programmx_handoff-overview_2026-10.md.

export const business = {
  currencyPresentment: "USD" as const, // patient-facing presentment currency; local currencies per rule P14 come with task 3.2
  firstVisitPlatformFeePct: 20, // (default until Q8)
  cardProcessingPct: 2.9,
  cardProcessingFixedCents: 30,
  slotHoldMinutes: 10,
  recordsBlockGb: 1,
  recordsBlockPriceCents: 999,
  shareDefaultDays: 30, // (default until Q13)
  membershipGraceDays: 7, // (default until Q8)
  removalSlaHours: 48,
  inviteRateLimitPerIpPerHour: 10,
  otpDigits: 6,
  verifiedReverifyMonths: 12,
  intakeMaxTurns: 20,
  defaultTimeZone: "Asia/Riyadh",
  supportWhatsApp: "", // set in env for production
  emergencyNumbers: {
    SA: "997", AE: "998", KW: "112", QA: "999", OM: "9999", BH: "999", US: "911",
  } as Record<string, string>,
  weekend: {
    SA: ["fri", "sat"], KW: ["fri", "sat"], QA: ["fri", "sat"], OM: ["fri", "sat"], BH: ["fri", "sat"], AE: ["sat", "sun"], US: ["sat", "sun"],
  } as Record<string, string[]>,
} as const;
