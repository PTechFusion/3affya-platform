// Shared bits of the removal queue (screen 41): which zone admin times render in, links that keep ?tz=, the SLA timer against
// business.removalSlaHours (amber from removalRules.slaWarnAfterHours, red once missed), and the evidence checks (rule A3).
import { business, removalRules } from "@/config/business";
import type { BadgeTone } from "@/components/ui";
import type { Locale } from "@/lib/format";
import { removalRequests, sampleAdmin, type RemovalStatus, type SampleRemovalRequest } from "@/lib/sample";
import { normaliseNpi } from "@/app/[locale]/doctors/[id]/this-is-me/validation";

export type SearchParams = Record<string, string | string[] | undefined>;

const HOUR_MS = 3_600_000;

/** `?tz=` when the prototype viewer sets a valid IANA zone, so links between the list and the detail can keep it. */
export function zoneParam(sp: SearchParams): string | undefined {
  return typeof sp.tz === "string" && sp.tz.includes("/") ? sp.tz : undefined;
}

/** Admin pages render in the signed-in admin's zone (sampleAdmin, Riyadh) unless ?tz= is set. */
export function adminZone(sp: SearchParams): string {
  return zoneParam(sp) ?? sampleAdmin.timeZone;
}

export type QueueTab = "open" | "decided";

/** The queue table's six columns from @3xl (listing, asked by, reason, checks or decision, received or decided, timer). The
 *  list, its header row and the loading rows share it so they line up. */
export const QUEUE_GRID =
  "@3xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.1fr)_9.5rem]";

/** The open queue is the default; ?tab=decided (or ?state=decided) shows the decided requests. */
export function tabFrom(sp: SearchParams): QueueTab {
  return sp.tab === "decided" || sp.state === "decided" ? "decided" : "open";
}

export const isDecided = (status: RemovalStatus) => status === "confirmed" || status === "refused";
export const tabOf = (r: SampleRemovalRequest): QueueTab => (isDecided(r.status) ? "decided" : "open");

/** List and detail links. `overdue` keeps the overdue-only view; `tz` survives navigation for the reviewer. */
export function removalsHref({ id, tab, overdue, tz }: { id?: string; tab?: QueueTab; overdue?: boolean; tz?: string }): string {
  const path = id ? `/admin/removals/${id}` : "/admin/removals";
  const q = new URLSearchParams();
  if (!id && tab === "decided") q.set("tab", "decided");
  if (!id && overdue) q.set("state", "overdue");
  if (tz) q.set("tz", tz);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

/** The public profile; a removed one is shown through the 410 preview (proxy.ts answers 410 for ?state=removed). */
export function publicProfileHref(r: SampleRemovalRequest): string {
  return r.status === "confirmed" ? `/doctors/${r.doctorId}?state=removed` : `/doctors/${r.doctorId}`;
}

/**
 * Where a request stands against the promise. Hours are whole hours, rounded down, so "8 h left" never overstates the time.
 * open: still inside the promise (warn from removalRules.slaWarnAfterHours); overdue: the promise was missed; paused: we asked
 * the doctor a question and the clock stopped at that moment (default until Dr Ayman confirms); decided: how long it took.
 */
export type Sla =
  | { kind: "open"; hoursLeft: number; dueAt: Date; warn: boolean }
  | { kind: "overdue"; hoursOver: number; dueAt: Date }
  | { kind: "paused"; hoursLeft: number; since: Date }
  | { kind: "decided"; hoursTaken: number; inTime: boolean; decidedAt: Date };

export function slaFor(r: SampleRemovalRequest, now: Date): Sla {
  const slaMs = business.removalSlaHours * HOUR_MS;
  const dueAt = new Date(r.receivedAt.getTime() + slaMs);
  if (r.decision) {
    const takenMs = r.decision.decidedAt.getTime() - r.receivedAt.getTime();
    return { kind: "decided", hoursTaken: Math.max(0, Math.floor(takenMs / HOUR_MS)), inTime: takenMs <= slaMs, decidedAt: r.decision.decidedAt };
  }
  if (r.status === "infoRequested" && r.infoRequest) {
    const leftMs = dueAt.getTime() - r.infoRequest.askedAt.getTime();
    return { kind: "paused", hoursLeft: Math.max(0, Math.floor(leftMs / HOUR_MS)), since: r.infoRequest.askedAt };
  }
  const leftMs = dueAt.getTime() - now.getTime();
  if (leftMs <= 0) return { kind: "overdue", hoursOver: Math.floor(-leftMs / HOUR_MS), dueAt };
  const ageHours = (now.getTime() - r.receivedAt.getTime()) / HOUR_MS;
  return { kind: "open", hoursLeft: Math.floor(leftMs / HOUR_MS), dueAt, warn: ageHours >= removalRules.slaWarnAfterHours };
}

export function slaTone(sla: Sla): BadgeTone {
  switch (sla.kind) {
    case "open":
      return sla.warn ? "warning" : "info";
    case "overdue":
      return "danger";
    case "paused":
      return "pending";
    case "decided":
      return sla.inTime ? "success" : "warning";
  }
}

/** Text colour of the large timer on the detail page, matching the badge tone. */
export function slaTextColour(sla: Sla): string {
  if (sla.kind === "overdue") return "text-danger";
  if (sla.kind === "open" && sla.warn) return "text-warning";
  return "text-sea-900";
}

export type CheckKey = "npi" | "name" | "email" | "unclaimed";
export type Check = { key: CheckKey; passed: boolean };

/** A name as people type it: no title (Dr, د.), no diacritics or punctuation, one space between parts, lower case. */
const bareName = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/^\s*(dr\.?|د\.)\s*/iu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();

/**
 * What the request can prove (rule A3: a person decides, with the evidence in front of them). The NPI is public, so a match only
 * says the request is about the right profile; the name and the confirmed email are what tie it to the doctor. A claimed profile
 * leaves this queue's scope: its owner edits or deletes it from the portal.
 */
export function checksFor(r: SampleRemovalRequest): Check[] {
  const name = bareName(r.requesterName);
  return [
    { key: "npi", passed: normaliseNpi(r.npi) === r.doctor.npi },
    { key: "name", passed: name === bareName(r.doctor.nameEn) || name === bareName(r.doctor.nameAr) },
    { key: "email", passed: r.emailConfirmedAt !== null },
    { key: "unclaimed", passed: r.doctor.state === "unclaimed" },
  ];
}

export type QueueRow = SampleRemovalRequest & { sla: Sla; checks: Check[] };

const toRow = (r: SampleRemovalRequest, now: Date): QueueRow => ({ ...r, sla: slaFor(r, now), checks: checksFor(r) });

/** Most urgent first: missed promises (longest overdue first), then least time left, then requests waiting on the doctor. */
function urgency(row: QueueRow): number {
  switch (row.sla.kind) {
    case "overdue":
    case "open":
      return row.sla.dueAt.getTime();
    case "paused":
      return Number.MAX_SAFE_INTEGER - (business.removalSlaHours - row.sla.hoursLeft);
    case "decided":
      return Number.MAX_SAFE_INTEGER;
  }
}

export type Queue = { open: QueueRow[]; decided: QueueRow[]; overdue: QueueRow[] };

/** The queue split by tab: open most urgent first, decided most recent decision first. */
export function queueFor(now: Date, requests: SampleRemovalRequest[] = removalRequests(now)): Queue {
  const rows = requests.map((r) => toRow(r, now));
  const open = rows.filter((r) => !isDecided(r.status)).sort((a, b) => urgency(a) - urgency(b));
  const decided = rows
    .filter((r) => isDecided(r.status))
    .sort((a, b) => (b.decision?.decidedAt.getTime() ?? 0) - (a.decision?.decidedAt.getTime() ?? 0));
  return { open, decided, overdue: open.filter((r) => r.sla.kind === "overdue") };
}

export const doctorName = (r: SampleRemovalRequest, locale: Locale) => (locale === "ar" ? r.doctor.nameAr : r.doctor.nameEn);

/** The admin who asked or decided, by id. One sample admin; production joins the admin's profile. */
export const adminName = (id: string, locale: Locale) => (id === sampleAdmin.id ? (locale === "ar" ? sampleAdmin.nameAr : sampleAdmin.nameEn) : id);
