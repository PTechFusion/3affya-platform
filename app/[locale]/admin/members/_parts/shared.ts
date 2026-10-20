// What the server page and the client sheet of the members list (screen 42) share: the filter views, the changes an admin can
// make per status, the list links, and the already-formatted view types (the server formats every date and amount, so the
// client never formats an instant and hydration cannot differ). No sample data and no server imports, so the client may use it.
import type { BadgeTone } from "@/components/ui";
import type { MembershipStatus } from "@/lib/sample";

/** The table's views (rule A5): Active and past due by default, the rest one chip away. */
export type MembersFilter = "current" | "cancelled" | "none" | "all";
export const MEMBERS_FILTERS: MembersFilter[] = ["current", "cancelled", "none", "all"];
export const FILTER_STATUSES: Record<MembersFilter, MembershipStatus[]> = {
  current: ["past_due", "active"],
  cancelled: ["cancelled"],
  none: ["none"],
  all: ["past_due", "active", "cancelled", "none"],
};

/** The changes an admin can make. Each sits in the detail sheet, one level down (rule A5). */
export type MembershipChange = "comp" | "extendGrace" | "cancelAtPeriodEnd" | "resume";
export const MEMBERSHIP_CHANGES: MembershipChange[] = ["comp", "extendGrace", "cancelAtPeriodEnd", "resume"];

/**
 * Which changes fit a status. Free months for an active member or to start one; extra grace only while a payment is past due;
 * cancel at period end while it would renew; resume (the undo of a cancel) until the period ends.
 */
export function changesFor(status: MembershipStatus): MembershipChange[] {
  switch (status) {
    case "active":
      return ["comp", "cancelAtPeriodEnd"];
    case "past_due":
      return ["extendGrace"];
    case "cancelled":
      return ["resume"];
    case "none":
      return ["comp"];
  }
}

export const STATUS_TONE: Record<MembershipStatus, BadgeTone> = { active: "success", past_due: "warning", cancelled: "pending", none: "unclaimed" };

/** The list's own query: the view, the prototype's ?tz=, the open sheet, and a change just made (or undone). */
export type MembersQuery = {
  status?: MembersFilter;
  tz?: string;
  doctor?: string;
  changed?: { doctorId: string; did: MembershipChange; months?: number };
  undone?: string;
};

export function membersHref(q: MembersQuery): string {
  const p = new URLSearchParams();
  if (q.status && q.status !== "current") p.set("status", q.status);
  if (q.tz) p.set("tz", q.tz);
  if (q.doctor) p.set("doctor", q.doctor);
  if (q.changed) {
    p.set("changed", q.changed.doctorId);
    p.set("did", q.changed.did);
    if (q.changed.months) p.set("months", String(q.changed.months));
  }
  if (q.undone) p.set("undone", q.undone);
  const query = p.toString();
  return query ? `/admin/members?${query}` : "/admin/members";
}

/**
 * One fact in the sheet's list, formatted. A value in parts renders each part as its own bidi isolate, joined by a middle dot
 * (rule R3); `note` is a line under the value; `warn` marks the grace and failed-payment lines; `ltr` a Latin zone name.
 */
export type DetailFact = { term: string; value: string | string[]; note?: string; warn?: boolean; ltr?: boolean };

/** The detail sheet for one professional, every string formatted on the server. */
export type MemberDetailView = {
  doctorId: string;
  name: string;
  specialty: string;
  status: MembershipStatus;
  statusLabel: string;
  tone: BadgeTone;
  free: boolean;
  body: string;
  facts: DetailFact[];
  zone: string;
  stripeLinks: Array<{ label: string; href: string }>;
  profileHref: string;
  comp?: { start: boolean; options: Array<{ months: number; label: string; until: string; submit: string }> };
  extend?: { hint: string; submit: string };
  cancel?: { hint: string };
  resume?: { hint: string };
};
