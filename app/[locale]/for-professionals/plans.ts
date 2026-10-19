// Membership plans for screen 12. Rule B8: three plans, features carry upward, at most four attributes differ between
// neighbouring plans (three from Claimed to Member, two from Member to Featured). Prices live in config/business.ts.
export type PlanId = "claimed" | "member" | "featured";

export const PLANS: PlanId[] = ["claimed", "member", "featured"];

/** Each feature with the first plan that includes it. Copy keys live under forProfessionals.features. */
export const PLAN_FEATURES: Array<{ key: string; from: PlanId }> = [
  { key: "profile", from: "claimed" },
  { key: "badge", from: "claimed" },
  { key: "card", from: "claimed" },
  { key: "search", from: "claimed" },
  { key: "booking", from: "member" },
  { key: "payouts", from: "member" },
  { key: "summaries", from: "member" },
  { key: "carousel", from: "featured" },
  { key: "first", from: "featured" },
];

export const planIncludes = (plan: PlanId, feature: { from: PlanId }) => PLANS.indexOf(plan) >= PLANS.indexOf(feature.from);
