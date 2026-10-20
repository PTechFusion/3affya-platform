// Screen 46 query model: which list, which funnel filter, the search and specialty filters, the preview state and the invite
// being written. Everything lives in the URL (rule S3), so a filtered view survives a reload and can be shared. Pure functions;
// server and client both import them.
import type { Locale } from "@/lib/format";
import type { OutreachInvite, SampleDoctor } from "@/lib/sample";

export type SearchParams = Record<string, string | string[] | undefined>;
export type OutreachTab = "sent" | "invite";
/** The funnel tiles' filters (opened counts every invite ever opened, claimed ones too) plus the two side counts. */
export type OutreachFilter = "opened" | "claimed" | "expired" | "bounced" | "revoked";
export type OutreachState = "loading" | "empty" | "error" | "just-sent" | "bounced";

export type OutreachQuery = {
  tab: OutreachTab;
  status?: OutreachFilter;
  q?: string;
  specialty?: string;
  state?: OutreachState;
  /** Doctor id of the invite being written (?invite=doc_020). */
  invite?: string;
  tz?: string;
};

const FILTERS: readonly OutreachFilter[] = ["opened", "claimed", "expired", "bounced", "revoked"];
const STATES: readonly OutreachState[] = ["loading", "empty", "error", "just-sent", "bounced"];
const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function readQuery(sp: SearchParams): OutreachQuery {
  const status = one(sp.status);
  const state = one(sp.state);
  const tz = one(sp.tz);
  return {
    tab: one(sp.tab) === "invite" ? "invite" : "sent",
    status: FILTERS.find((f) => f === status),
    q: one(sp.q)?.slice(0, 80),
    specialty: one(sp.specialty),
    state: STATES.find((s) => s === state),
    invite: one(sp.invite),
    tz: tz?.includes("/") ? tz : undefined,
  };
}

/** The outreach URL for a query. Filters apply to one tab: switching tabs drops them; the viewer zone always carries over. */
export function outreachHref(q: Partial<OutreachQuery>): string {
  const params = new URLSearchParams();
  if (q.invite) params.set("invite", q.invite);
  if (q.tab === "invite") params.set("tab", "invite");
  if (q.status) params.set("status", q.status);
  if (q.q) params.set("q", q.q);
  if (q.specialty) params.set("specialty", q.specialty);
  if (q.state) params.set("state", q.state);
  if (q.tz) params.set("tz", q.tz);
  const s = params.toString();
  return s ? `/admin/outreach?${s}` : "/admin/outreach";
}

export function matchesFilter(i: OutreachInvite, f: OutreachFilter | undefined): boolean {
  if (!f) return true;
  if (f === "opened") return Boolean(i.openedAt || i.claimedAt);
  return i.status === f;
}

// Case, Latin accents and Arabic short vowels do not count, so "maha", "Maha" and "مها" with or without tashkeel all match.
const fold = (s: string) => s.toLocaleLowerCase("en").normalize("NFKD").replace(/[̀-ًͯ-ْٰ]/g, "");

/** Name in either script, NPI, and (on the sent list) the address the invite went to. */
export function matchesSearch(doctor: SampleDoctor, q: string | undefined, email?: string): boolean {
  if (!q) return true;
  const needle = fold(q);
  return [doctor.nameEn, doctor.nameAr, doctor.npi, email ?? ""].some((field) => fold(field).includes(needle));
}

export type FunnelCounts = { sent: number; opened: number; claimed: number; expired: number; bounced: number; revoked: number };

export function funnelCounts(invites: OutreachInvite[]): FunnelCounts {
  const n = (f: OutreachFilter) => invites.filter((i) => matchesFilter(i, f)).length;
  return { sent: invites.length, opened: n("opened"), claimed: n("claimed"), expired: n("expired"), bounced: n("bounced"), revoked: n("revoked") };
}

/** Joins a date and a clock time: the Arabic comma in Arabic, a Latin comma in English. */
export const dateAndTime = (date: string, time: string, loc: Locale) => `${date}${loc === "ar" ? "، " : ", "}${time}`;
