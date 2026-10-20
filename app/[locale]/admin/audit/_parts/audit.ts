// Screen 47 model: the filters in the URL, which entries they keep, page size, and links that keep filters and ?tz=.
// Pure functions shared by the page and the export action, so the CSV holds exactly the rows the page shows.
import { ALL_AUDIT_ACTIONS, AUDIT_ACTIONS, AUDIT_AREAS, AUDIT_TARGETS, areaOf, type AuditArea, type AuditTargetType } from "@/lib/audit";
import { formatDate, instantAtHourInZone } from "@/lib/format";
import { auditActorById, auditActors, sampleAdmin, type SampleAuditEntry } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";

export type SearchParams = Record<string, string | string[] | undefined>;

/** Rows per "Load more" step (rule S5: 15 to 30 on phone; an admin log reads in twenties). */
export const AUDIT_PAGE_SIZE = 20;

export type AuditFilters = { actor?: string; action?: string; target?: AuditTargetType; from?: string; to?: string };
const FILTER_KEYS = ["actor", "action", "target", "from", "to"] as const;

const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Actor filter: one admin, any professional, any patient, or one system actor. */
export const ACTOR_KINDS = ["professional", "patient"] as const;
export const adminActorIds = () => auditActors.filter((a) => a.kind === "admin").map((a) => a.id);
export const systemActorIds = () => auditActors.filter((a) => a.kind === "system").map((a) => a.id);

function validActor(v: string | undefined) {
  if (!v) return undefined;
  if ((ACTOR_KINDS as readonly string[]).includes(v)) return v;
  const a = auditActorById(v);
  return a && (a.kind === "admin" || a.kind === "system") ? v : undefined;
}

const validAction = (v: string | undefined) =>
  v && ((AUDIT_AREAS as readonly string[]).includes(v) || (ALL_AUDIT_ACTIONS as readonly string[]).includes(v)) ? v : undefined;

const validTarget = (v: string | undefined) => (v && (AUDIT_TARGETS as readonly string[]).includes(v) ? (v as AuditTargetType) : undefined);

function validDay(v: string | undefined) {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? undefined : v;
}

/**
 * The filters a URL (or the export form) asks for. Unknown values are dropped, never guessed. `dateError` is set when the
 * end day is before the start day: both days stay in the form (rule L4, input preserved) but no date range is applied.
 */
export function filtersFrom(sp: SearchParams): { filters: AuditFilters; dateError: boolean } {
  const filters: AuditFilters = {
    actor: validActor(one(sp.actor)),
    action: validAction(one(sp.action)),
    target: validTarget(one(sp.target)),
    from: validDay(one(sp.from)),
    to: validDay(one(sp.to)),
  };
  const dateError = !!(filters.from && filters.to && filters.from > filters.to);
  return { filters, dateError };
}

/** ?state=empty with no filters of its own shows these: Khalid has never touched money, so nothing matches. */
export const EMPTY_DEMO_FILTERS: AuditFilters = { actor: "adm_002", action: "money" };

export const appliedCount = (f: AuditFilters) => FILTER_KEYS.filter((k) => f[k]).length;
/** Filters that live one level down, under More filters (rule A5). */
export const moreCount = (f: AuditFilters) => (["target", "from", "to"] as const).filter((k) => f[k]).length;

export function tzOverride(sp: SearchParams): string | undefined {
  return typeof sp.tz === "string" ? viewerFrom(sp).timeZone : undefined;
}

/** Admin pages render in the signed-in admin's zone unless ?tz= is set (sampleAdmin). Stored instants stay UTC. */
export const adminZone = (tz: string | undefined) => tz ?? sampleAdmin.timeZone;

/** Midnight at the start of a calendar day in `zone`. Noon UTC falls on the same calendar day in every zone within ±11 h. */
function dayStart(ymd: string, zone: string, addDays = 0): Date {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return instantAtHourInZone(0, zone, new Date(Date.UTC(y, m - 1, d + addDays, 12)));
}

function actorMatches(e: SampleAuditEntry, actor: string) {
  if ((ACTOR_KINDS as readonly string[]).includes(actor)) return auditActorById(e.actorId)?.kind === actor;
  return e.actorId === actor;
}

function actionMatches(e: SampleAuditEntry, action: string) {
  return (AUDIT_AREAS as readonly string[]).includes(action) ? areaOf(e.action) === action : e.action === action;
}

export function applyFilters(entries: SampleAuditEntry[], f: AuditFilters, zone: string, dateError: boolean): SampleAuditEntry[] {
  const from = f.from && !dateError ? dayStart(f.from, zone).getTime() : undefined;
  const until = f.to && !dateError ? dayStart(f.to, zone, 1).getTime() : undefined;
  return entries.filter(
    (e) =>
      (!f.actor || actorMatches(e, f.actor)) &&
      (!f.action || actionMatches(e, f.action)) &&
      (!f.target || e.target.type === f.target) &&
      (from === undefined || e.at.getTime() >= from) &&
      (until === undefined || e.at.getTime() < until),
  );
}

export function pageFrom(sp: SearchParams): number {
  const n = Number(one(sp.page));
  return Number.isInteger(n) && n > 1 ? Math.min(n, 50) : 1;
}

/** /admin/audit with the filters, ?tz= and an optional page or open row. Empty values are left out of the URL. */
export function auditHref(f: AuditFilters, tz: string | undefined, extra: { page?: number; open?: string } = {}): string {
  const q = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = f[k];
    if (v) q.set(k, v);
  }
  if (tz) q.set("tz", tz);
  if (extra.page && extra.page > 1) q.set("page", String(extra.page));
  if (extra.open) q.set("open", extra.open);
  const s = q.toString();
  return s ? `/admin/audit?${s}` : "/admin/audit";
}

/** The calendar day an instant falls on in `zone`, as a stable key for grouping rows by day. */
export const dayKey = (instant: Date, zone: string) => formatDate(instant, zone, "en");

export const actionsByArea: ReadonlyArray<{ area: AuditArea; actions: readonly string[] }> = AUDIT_AREAS.map((area) => ({
  area,
  actions: AUDIT_ACTIONS[area],
}));
