// The listings model (screen 39): URL state, matching, counts, re-verification and links. Every bit of state is in the URL, so
// Back, reload and a shared link show the same table (rule S3): ?status=&specialty=&q=&per=&shown=&tz=, ?edit=<id> for the
// drawer, and the change the last action made (?suspended= ?unsuspended= ?saved= ?undone=), which stands in for the row the
// action would write until task 2.8 stores it.
import { listingRules, business } from "@/config/business";
import type { BadgeTone } from "@/components/ui";
import { DAY_MS, type Locale } from "@/lib/format";
import { listingStatuses, sampleAdmin, sampleListings, sampleSpecialties, type ListingStatus, type SampleListing } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { words } from "@/app/[locale]/search/search-query";
import { checkNameAr } from "./validation";

export type SearchParams = Record<string, string | string[] | undefined>;
export type StatusFilter = ListingStatus | "all";
export const statusFilters: readonly StatusFilter[] = ["all", ...listingStatuses];

/** Rows before Load more (rule S5: 25 to 75 on desktop). The registry import makes this 66k rows, so filters do the work. */
export const PAGE_SIZE = 50;

export type ListingsQuery = {
  status: StatusFilter;
  specialty: string | null;
  q: string;
  /** The prototype viewer's zone switch (?tz=), kept on every link. */
  tz: string | null;
  /** Prototype: a smaller page (?per=) so Load more shows with the sample rows. */
  per: number;
  shown: number;
};

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const specialtySlugs = new Set(sampleSpecialties.map((s) => s.slug));

/** The zero-result combination ?state=empty opens when no filter is set: no cardiology claim has been rejected. */
const EMPTY_PREVIEW = { status: "rejected", specialty: "cardiology" } as const;

export function parseQuery(sp: SearchParams): ListingsQuery {
  const preview = sp.state === "empty" && !str(sp.status) && !str(sp.specialty) && !str(sp.q);
  const statusRaw = preview ? EMPTY_PREVIEW.status : str(sp.status);
  const specialtyRaw = preview ? EMPTY_PREVIEW.specialty : str(sp.specialty);
  const perRaw = Number(str(sp.per));
  const per = Number.isInteger(perRaw) && perRaw >= 1 && perRaw <= PAGE_SIZE ? perRaw : PAGE_SIZE;
  const shownRaw = Number(str(sp.shown));
  return {
    status: statusFilters.find((s) => s === statusRaw) ?? "all",
    specialty: specialtyRaw && specialtySlugs.has(specialtyRaw) ? specialtyRaw : null,
    q: (str(sp.q) ?? "").trim().slice(0, 100),
    tz: typeof sp.tz === "string" ? viewerFrom(sp).timeZone : null,
    per,
    shown: Number.isInteger(shownRaw) && shownRaw > per ? shownRaw : per,
  };
}

/** The listings URL for a query, with any of its parts changed. The drawer and the change markers ride in `extra`. */
export function listingsHref(q: ListingsQuery, patch: Partial<ListingsQuery> = {}, extra: Record<string, string> = {}): string {
  const next = { ...q, ...patch };
  const p = new URLSearchParams();
  if (next.status !== "all") p.set("status", next.status);
  if (next.specialty) p.set("specialty", next.specialty);
  if (next.q) p.set("q", next.q);
  if (next.per !== PAGE_SIZE) p.set("per", String(next.per));
  if (next.shown > next.per) p.set("shown", String(next.shown));
  if (next.tz) p.set("tz", next.tz);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  const s = p.toString();
  return s ? `/admin/listings?${s}` : "/admin/listings";
}

export const adminZone = (q: ListingsQuery) => q.tz ?? sampleAdmin.timeZone;

/** Badge tone per status. Unclaimed is plain sand and verified gold with a check, so the two never look alike (rule U1). */
export const statusTone: Record<ListingStatus, BadgeTone> = {
  unclaimed: "unclaimed",
  claimed: "info",
  inReview: "warning",
  verified: "verified",
  rejected: "danger",
  suspended: "danger",
  removed: "pending",
};

/* ---------------- Matching ---------------- */

const STOPWORDS = new Set(["dr", "doctor", "د", "دكتور", "دكتوره"]);
const tokens = (s: string) => words(s).filter((w) => !STOPWORDS.has(w));

/** Name in either script (word starts, letter variants folded as on /search, rule S2), or any run of NPI digits. */
export function matchesText(l: SampleListing, q: string): boolean {
  if (!q) return true;
  const digits = q.replace(/[\s-]/g, "");
  if (/^\d{3,10}$/.test(digits)) return l.doctor.npi.includes(digits);
  const wanted = tokens(q);
  if (!wanted.length) return true;
  const have = tokens(`${l.doctor.nameEn} ${l.doctor.nameAr}`);
  return wanted.every((w) => have.some((h) => h.startsWith(w)));
}

const inSpecialty = (l: SampleListing, slug: string | null) => !slug || l.doctor.specialty === slug;
const inStatus = (l: SampleListing, s: StatusFilter) => s === "all" || l.status === s;

export function filterListings(all: SampleListing[], q: ListingsQuery): SampleListing[] {
  return all.filter((l) => inStatus(l, q.status) && inSpecialty(l, q.specialty) && matchesText(l, q.q));
}

/** Rule S10: the count beside each status chip, with the other filters (specialty, text) applied. */
export function statusCounts(all: SampleListing[], q: ListingsQuery): Record<StatusFilter, number> {
  const base = all.filter((l) => inSpecialty(l, q.specialty) && matchesText(l, q.q));
  const counts = Object.fromEntries(statusFilters.map((s) => [s, 0])) as Record<StatusFilter, number>;
  counts.all = base.length;
  for (const l of base) counts[l.status] += 1;
  return counts;
}

/** The count beside each specialty option, with the status and text filters applied. Only specialties with listings show. */
export function specialtyCounts(all: SampleListing[], q: ListingsQuery): Map<string, number> {
  const counts = new Map<string, number>();
  for (const l of all) {
    if (!inStatus(l, q.status) || !matchesText(l, q.q)) continue;
    counts.set(l.doctor.specialty, (counts.get(l.doctor.specialty) ?? 0) + 1);
  }
  if (q.specialty && !counts.has(q.specialty)) counts.set(q.specialty, 0);
  return counts;
}

/** Name order in the viewer's script, so a long table scans like an index. */
export function byName(locale: Locale) {
  const collator = new Intl.Collator(locale === "ar" ? "ar" : "en", { sensitivity: "base" });
  const name = (l: SampleListing) => (locale === "ar" ? l.doctor.nameAr : l.doctor.nameEn).replace(/^(Dr\.?|د\.)\s*/, "");
  return (a: SampleListing, b: SampleListing) => collator.compare(name(a), name(b));
}

/* ---------------- Re-verification (rule A2) ---------------- */

export type Reverification = { on: Date; basis: "licence" | "cycle"; days: number; due: "ok" | "soon" | "overdue" };

/** The next check: the licence expiry or the yearly cycle after the verified-on date, whichever is first. Null if not verified. */
export function nextReverification(l: SampleListing, now: Date = new Date()): Reverification | null {
  if (!l.verifiedOn) return null;
  const v = l.verifiedOn;
  const cycle = new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth() + business.verifiedReverifyMonths, v.getUTCDate()));
  const licence = l.licenceExpiresOn;
  const [on, basis] = licence && licence.getTime() < cycle.getTime() ? [licence, "licence" as const] : [cycle, "cycle" as const];
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((on.getTime() - today) / DAY_MS);
  return { on, basis, days, due: days < 0 ? "overdue" : days <= listingRules.reverifyDueSoonDays ? "soon" : "ok" };
}

/* ---------------- The change the last action made ---------------- */

export type ChangeKind = "suspended" | "unsuspended" | "saved" | "undone";
export type Change = { kind: ChangeKind; id: string };

/** ?state=suspended previews the list right after Dr Karim Saleh (doc_004) was suspended. */
const SUSPENDED_PREVIEW = "doc_004";

/**
 * The listings with the last action's change laid over them, and that change (for the Undo bar). An id that does not fit the
 * change (suspending a row that is not verified, say) is ignored, so a hand-edited URL cannot show an impossible row.
 */
export function withChange(sp: SearchParams, now: Date = new Date()): { listings: SampleListing[]; change: Change | null } {
  const listings = sampleListings();
  const find = (id: string | undefined) => (id ? listings.find((l) => l.doctor.id === id) : undefined);
  const replace = (next: SampleListing) => listings.map((l) => (l.doctor.id === next.doctor.id ? next : l));

  const suspended = find(str(sp.suspended) ?? (sp.state === "suspended" ? SUSPENDED_PREVIEW : undefined));
  if (suspended?.status === "verified") {
    const next: SampleListing = {
      ...suspended,
      status: "suspended",
      suspension: { at: now, byEn: sampleAdmin.nameEn, byAr: sampleAdmin.nameAr, reasonEn: null, reasonAr: null },
    };
    return { listings: replace(next), change: { kind: "suspended", id: next.doctor.id } };
  }
  const unsuspended = find(str(sp.unsuspended));
  if (unsuspended?.status === "suspended") {
    return { listings: replace({ ...unsuspended, status: "verified", suspension: null }), change: { kind: "unsuspended", id: unsuspended.doctor.id } };
  }
  const saved = find(str(sp.saved));
  if (saved && saved.status !== "removed") {
    const nameAr = str(sp.savedNameAr)?.trim() ?? saved.doctor.nameAr;
    const specialty =
      sampleSpecialties.find((s) => s.slug === str(sp.savedSpecialty)) ?? sampleSpecialties.find((s) => s.slug === saved.doctor.specialty);
    if (!checkNameAr(nameAr) && specialty) {
      const doctor = { ...saved.doctor, nameAr, specialty: specialty.slug, specialtyEn: specialty.nameEn, specialtyAr: specialty.nameAr };
      return { listings: replace({ ...saved, doctor }), change: { kind: "saved", id: saved.doctor.id } };
    }
  }
  const undone = find(str(sp.undone));
  if (undone) return { listings, change: { kind: "undone", id: undone.doctor.id } };
  return { listings, change: null };
}
