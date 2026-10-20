// The audit log's vocabulary (screen 47, task 2.8): what an entry can say happened, to what, by whom, and how its values read.
// The log is append only. Production writes rows to an audit_log table from server code and webhook handlers in the same
// transaction as the change they describe; RLS grants admins SELECT only and a trigger refuses UPDATE and DELETE, so no
// screen, admin or job can rewrite history. Copy for every key here lives in messages under adminAudit.*.

/** Areas group actions for the action filter ("every money event"). */
export const AUDIT_AREAS = ["verification", "listings", "money", "records", "security"] as const;
export type AuditArea = (typeof AUDIT_AREAS)[number];

export const AUDIT_ACTIONS = {
  // Rule A1: every verification step names its actor; checks carry the source, the date and who checked.
  verification: ["claim.submitted", "verification.checkRecorded", "verification.approved", "verification.rejected", "reverification.scheduled"],
  listings: ["registry.refreshed", "listing.edited", "removal.confirmed", "removal.refused", "specialty.edited", "invite.created", "invite.used", "invite.expired"],
  // Money state is written only by the Stripe webhook handler (ADR), so payments, refunds and payouts have the Stripe actor.
  money: ["payment.succeeded", "booking.cancelled", "refund.succeeded", "payout.paid", "membership.started"],
  records: ["recordSet.uploaded", "recordSet.summarised", "recordSet.failed", "share.created", "share.opened", "summary.reviewed"],
  security: ["admin.signedIn", "admin.signInRefused", "auditLog.exported"],
} as const satisfies Record<AuditArea, readonly string[]>;

export type AuditAction = (typeof AUDIT_ACTIONS)[AuditArea][number];

export const ALL_AUDIT_ACTIONS: readonly AuditAction[] = AUDIT_AREAS.flatMap((a) => AUDIT_ACTIONS[a]);

export function areaOf(action: AuditAction): AuditArea {
  return AUDIT_AREAS.find((a) => (AUDIT_ACTIONS[a] as readonly string[]).includes(action)) ?? "security";
}

export const AUDIT_TARGETS = [
  "professional",
  "booking",
  "payout",
  "membership",
  "specialty",
  "invite",
  "recordSet",
  "share",
  "adminAccount",
  "registryImport",
  "auditLog",
] as const;
export type AuditTargetType = (typeof AUDIT_TARGETS)[number];

export type AuditActorKind = "admin" | "professional" | "patient" | "system";

/** Value kinds. Enum kinds read through adminAudit.values.<kind>.<value>; the rest are formatted by kind (lib/format). */
export const AUDIT_ENUM_KINDS = [
  "listingStatus",
  "inviteStatus",
  "bookingStatus",
  "membershipStatus",
  "recordSetStatus",
  "shareStatus",
  "factor",
  "refundOutcome",
  "plan",
] as const;
export type AuditEnumKind = (typeof AUDIT_ENUM_KINDS)[number];
export type AuditValueKind = AuditEnumKind | "text" | "code" | "count" | "money" | "date";

export type AuditValue = string | number | null;

/** One field's before and after. `currency` for money; `lang` when a text value is in one script (rule R4). */
export type AuditChange = { field: string; kind: AuditValueKind; old: AuditValue; new: AuditValue; currency?: string; lang?: "ar" | "en" };

/** A fact about the event that is not a change (the sign-in factor, the export's filter). */
export type AuditDetail = { field: string; kind: AuditValueKind; value: AuditValue; currency?: string; lang?: "ar" | "en" };

/** Rule A1: licence against the state board, board certification against ABMS, sanctions against FSMB. */
export type AuditCheckKind = "licence" | "board" | "sanctions";
export type AuditCheckResult = "active" | "certified" | "noneFound" | "notConfirmed";
export const auditCheckPassed = (r: AuditCheckResult) => r !== "notConfirmed";
