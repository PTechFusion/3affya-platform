// FAQ structure (screen 13). Copy lives under faq.* in messages; this file only orders the groups and questions and names the
// page each answer can point to. Four groups from the layout call, questions front-loaded with the words patients search for.

export const FAQ_GROUPS = [
  { id: "patients", items: ["travel", "usDoctor", "cannotDo", "boardCertified", "account", "visitTime", "dialect"] },
  { id: "fees", items: ["cost", "included", "pay", "cancel", "afterVisit"] },
  { id: "records", items: ["processing", "aiConsent", "storage", "recordsCost", "notDiagnosis", "sharing", "deleting"] },
  { id: "doctors", items: ["whoCanJoin", "claim", "verification", "removal", "payouts"] },
] as const;

export type FaqGroupId = (typeof FAQ_GROUPS)[number]["id"];
export type FaqItemId = (typeof FAQ_GROUPS)[number]["items"][number];

/** Answers that have a fuller page get one labelled link under the answer (rule X5: details behind a labelled control). */
export const FAQ_LINKS: Partial<Record<FaqItemId, string>> = {
  usDoctor: "/how-it-works",
  boardCertified: "/why-us-training",
  cost: "/fees",
  cancel: "/refunds",
  storage: "/privacy",
  whoCanJoin: "/for-professionals",
};

/** Calendar date the answers were last reviewed (rule X4). Update when Dr Ayman approves a change to the copy. */
export const FAQ_REVIEWED_ON = "2026-10-19";

/** Sample instant for the time-zone answer: 15:00 UTC renders as 6:00 PM in Riyadh, or in whatever zone ?tz= names. */
export const FAQ_EXAMPLE_SLOT_UTC = "2026-11-03T15:00:00Z";
