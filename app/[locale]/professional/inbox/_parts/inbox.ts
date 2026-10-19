// Shared bits of the inbox (screen 32): who is signed in, which zone times render in, and how rows group into sections.
import type { Locale } from "@/lib/format";
import { inboxStatus, introductionsFor, type InboxStatus, type SampleIntroduction } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";

/** Prototype: the signed-in professional is the sample doctor doc_002 (Chicago). Task 3.3 reads the id from the session. */
export const signedInDoctorId = () => "doc_002";

export type SearchParams = Record<string, string | string[] | undefined>;

/** The doctor's zone: `?tz=` when the prototype viewer sets one (lib/viewer), otherwise the zone stored on the booking. */
export function zoneOverride(sp: SearchParams): string | undefined {
  return typeof sp.tz === "string" ? viewerFrom(sp).timeZone : undefined;
}

/** Keeps `?tz=` on links between the list and the detail, so the reviewer's zone survives navigation. */
export function inboxHref(id: string | undefined, tz: string | undefined): string {
  const path = id ? `/professional/inbox/${id}` : "/professional/inbox";
  return tz ? `${path}?tz=${encodeURIComponent(tz)}` : path;
}

export type InboxEntry = SampleIntroduction & { inbox: InboxStatus };
export type InboxGroups = { requests: InboxEntry[]; upcoming: InboxEntry[]; past: InboxEntry[] };

export function inboxEntries(doctorId: string, now: Date = new Date()): InboxEntry[] {
  return introductionsFor(doctorId).map((i) => ({ ...i, inbox: inboxStatus(i, now) }));
}

/** Requests and upcoming visits soonest first; past visits most recent first. */
export function groupEntries(entries: InboxEntry[]): InboxGroups {
  return {
    requests: entries.filter((e) => e.inbox === "request"),
    upcoming: entries.filter((e) => e.inbox === "upcoming"),
    past: entries.filter((e) => e.inbox === "awaitingDone" || e.inbox === "done").reverse(),
  };
}

export const statusTone = { request: "info", upcoming: "success", awaitingDone: "warning", done: "pending" } as const;

export const patientName = (i: SampleIntroduction, locale: Locale) => (locale === "ar" ? i.patientFirstNameAr : i.patientFirstNameEn);
