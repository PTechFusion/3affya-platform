// A professional's Stripe Connect Express account as the payouts page (screen 35) reads it, and later the admin views (task
// 3.1 "admin sees connected account status", screen 43). The inputs are the fields Stripe sends on `account.updated`, stored by
// the webhook handler: money and account state is written only from webhooks (ADR-6). Stripe hosts onboarding and the payout
// dashboard; this file only turns those flags into the status, the three steps and the list of what Stripe still needs.

export type PayoutRecordStatus = "paid" | "inTransit" | "failed";
export type PayoutRecord = { id: string; arrivesAt: Date; amountCents: number; currency: string; status: PayoutRecordStatus };

export type PayoutAccount = {
  /** Null until the first "Set up payouts" creates the Express account. */
  stripeAccountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  /** Stripe requirement paths (requirements.currently_due and requirements.past_due), e.g. "external_account". */
  currentlyDue: string[];
  pastDue: string[];
  /** Last digits of the payout bank account, which is all Stripe shares; the full details stay with Stripe. */
  bankLast4: string | null;
  nextPayout: Omit<PayoutRecord, "id" | "status"> | null;
  /** Newest first. */
  recentPayouts: PayoutRecord[];
};

export type PayoutStatus = "notStarted" | "inProgress" | "enabled" | "restricted";
export const payoutStatuses: PayoutStatus[] = ["notStarted", "inProgress", "enabled", "restricted"];

/** Patients can book (and pay) only when Stripe has switched on both card payments and payouts (task 3.1). */
export function canTakeBookings(a: PayoutAccount): boolean {
  return a.chargesEnabled && a.payoutsEnabled;
}

export function payoutStatus(a: PayoutAccount): PayoutStatus {
  if (!a.stripeAccountId) return "notStarted";
  if (canTakeBookings(a)) return "enabled";
  // Onboarding not finished yet. A finished account that is switched off with items outstanding is restricted; one with
  // nothing outstanding is still under Stripe's review, which reads as in progress.
  if (!a.detailsSubmitted) return "inProgress";
  return payoutNeeds(a).length ? "restricted" : "inProgress";
}

export type PayoutStepKey = "identity" | "bank" | "payouts";
export type PayoutStepStatus = "done" | "current" | "todo" | "needed" | "paused";
export type PayoutStep = { key: PayoutStepKey; status: PayoutStepStatus };

export type PayoutNeedKey =
  | "idDocument"
  | "addressDocument"
  | "ssn"
  | "dob"
  | "address"
  | "phone"
  | "website"
  | "bankAccount"
  | "terms"
  | "other";
export type PayoutNeed = { key: PayoutNeedKey; step: PayoutStepKey; overdue: boolean };

// Stripe requirement paths, by prefix, to one plain item each (rule L3: name what Stripe needs). First match wins.
const NEED_PREFIXES: Array<[string, PayoutNeedKey]> = [
  ["individual.verification.additional_document", "addressDocument"],
  ["individual.verification.document", "idDocument"],
  ["individual.ssn_last_4", "ssn"],
  ["individual.id_number", "ssn"],
  ["individual.dob", "dob"],
  ["individual.address", "address"],
  ["individual.phone", "phone"],
  ["business_profile.url", "website"],
  ["external_account", "bankAccount"],
  ["tos_acceptance", "terms"],
];

const NEED_STEP: Record<PayoutNeedKey, PayoutStepKey> = {
  idDocument: "identity",
  addressDocument: "identity",
  ssn: "identity",
  dob: "identity",
  address: "identity",
  phone: "identity",
  website: "identity",
  bankAccount: "bank",
  terms: "payouts",
  other: "payouts",
};

function needKey(path: string): PayoutNeedKey {
  return NEED_PREFIXES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}.`))?.[1] ?? "other";
}

/** What Stripe still needs, one line per item (dob.day, dob.month and dob.year are one item), overdue items first. */
export function payoutNeeds(a: PayoutAccount): PayoutNeed[] {
  const seen = new Map<PayoutNeedKey, PayoutNeed>();
  const lists: Array<[string[], boolean]> = [
    [a.pastDue, true],
    [a.currentlyDue, false],
  ];
  for (const [paths, overdue] of lists) {
    for (const path of paths) {
      const key = needKey(path);
      if (!seen.has(key)) seen.set(key, { key, step: NEED_STEP[key], overdue });
    }
  }
  return [...seen.values()];
}

/**
 * The three steps (identity, bank, payouts on) with the current one marked (rule F3). Not started: identity is next. While
 * onboarding, the first step with items outstanding is current. Restricted: every step with items outstanding is needed and
 * payouts are paused. Enabled: all done.
 */
export function payoutSteps(a: PayoutAccount): PayoutStep[] {
  const status = payoutStatus(a);
  if (status === "notStarted") {
    return [
      { key: "identity", status: "current" },
      { key: "bank", status: "todo" },
      { key: "payouts", status: "todo" },
    ];
  }
  if (status === "enabled") {
    return (["identity", "bank", "payouts"] as const).map((key) => ({ key, status: "done" }));
  }
  const needs = payoutNeeds(a);
  const outstanding = (step: PayoutStepKey) => needs.some((n) => n.step === step);
  let currentTaken = false;
  const mark = (step: PayoutStepKey): PayoutStepStatus => {
    if (!outstanding(step)) return "done";
    if (status === "restricted") return "needed";
    if (currentTaken) return "todo";
    currentTaken = true;
    return "current";
  };
  const identity = mark("identity");
  const bank = mark("bank");
  // The last step is Stripe's review and switch-on: paused when restricted, current once nothing earlier is outstanding.
  const payouts: PayoutStepStatus = status === "restricted" ? "paused" : currentTaken ? "todo" : "current";
  return [
    { key: "identity", status: identity },
    { key: "bank", status: bank },
    { key: "payouts", status: payouts },
  ];
}
