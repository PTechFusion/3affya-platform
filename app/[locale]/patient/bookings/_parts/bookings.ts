// Shared bits of the bookings list (screen 22): which zone times render in, links that keep the prototype's params, how the
// patient's bookings split into the Upcoming and Past tabs, and what cancelling one now would refund.
import { refundsInFull } from "@/lib/refunds";
import type { Locale } from "@/lib/format";
import { bookingsForPatient, samplePatient, type PatientBooking, type SampleDoctor } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";

export type SearchParams = Record<string, string | string[] | undefined>;
export type BookingsTab = "upcoming" | "past";

/** The patient's zone (rule P6): `?tz=` when the prototype viewer sets one, otherwise the signed-in patient's own. */
export function patientZone(sp: SearchParams): string {
  return typeof sp.tz === "string" ? viewerFrom(sp).timeZone : samplePatient.timeZone;
}

export const tabFrom = (sp: SearchParams): BookingsTab => (sp.tab === "past" ? "past" : "upcoming");

/**
 * Sample-data switches (prototype only): `empty` has no bookings at all, `noUpcoming` only past and cancelled ones (the
 * patient after their visit), `noPast` only upcoming ones (the patient right after a first booking).
 */
const SAMPLE_STATES = ["empty", "noUpcoming", "noPast"] as const;
type SampleState = (typeof SAMPLE_STATES)[number];
const sampleState = (sp: SearchParams): SampleState | undefined =>
  SAMPLE_STATES.find((s) => s === sp.state);

/** The list link for a tab. Keeps `?tz=`, the sample switch and a just-cancelled booking, so the reviewer's view survives. */
export function listHref(sp: SearchParams, tab: BookingsTab, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams();
  if (tab === "past") q.set("tab", "past");
  const state = sampleState(sp);
  if (state) q.set("state", state);
  if (typeof sp.cancelled === "string") q.set("cancelled", sp.cancelled);
  if (typeof sp.tz === "string") q.set("tz", sp.tz);
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  const query = q.toString();
  return query ? `/patient/bookings?${query}` : "/patient/bookings";
}

/** A booking's own page (screen 21). Keeps `?tz=` so the times read the same on both pages. */
export function bookingHref(id: string, sp: SearchParams): string {
  return typeof sp.tz === "string" ? `/patient/bookings/${id}?tz=${encodeURIComponent(sp.tz)}` : `/patient/bookings/${id}`;
}

/** A paid visit the patient can still cancel: confirmed and not started. */
export const cancellable = (b: PatientBooking, now: Date) => b.status === "upcoming" && b.startsAt.getTime() > now.getTime();

/**
 * The signed-in patient's bookings as the page shows them. Prototype: `?cancelled=<id>` stands in for the row the cancel
 * action would write (task 3.6), so the list after a cancellation is reachable and reviewable; it applies only to a booking
 * that could still be cancelled.
 */
export function patientBookings(sp: SearchParams, now: Date): { bookings: PatientBooking[]; justCancelled?: PatientBooking } {
  const state = sampleState(sp);
  if (state === "empty") return { bookings: [] };
  let bookings = bookingsForPatient(samplePatient.firstNameEn, now);
  let justCancelled: PatientBooking | undefined;
  const target = typeof sp.cancelled === "string" ? bookings.find((b) => b.id === sp.cancelled) : undefined;
  if (target && cancellable(target, now)) {
    justCancelled = {
      ...target,
      status: refundsInFull(target.startsAt, now) ? "refunded" : "cancelled",
      cancelledAt: now,
      cancelledBy: "patient",
      joinUrl: null,
    };
    bookings = bookings.map((b) => (b.id === target.id ? (justCancelled as PatientBooking) : b));
  }
  if (state === "noUpcoming") bookings = bookings.filter((b) => b.status !== "upcoming");
  if (state === "noPast") bookings = bookings.filter((b) => b.status === "upcoming");
  return { bookings, justCancelled };
}

export type BookingGroups = { upcoming: PatientBooking[]; past: PatientBooking[]; cancelled: PatientBooking[] };

/** Upcoming soonest first; past and cancelled visits most recent first. */
export function groupBookings(bookings: PatientBooking[]): BookingGroups {
  const latestFirst = (a: PatientBooking, b: PatientBooking) => b.startsAt.getTime() - a.startsAt.getTime();
  return {
    upcoming: bookings.filter((b) => b.status === "upcoming"),
    past: bookings.filter((b) => b.status === "done").sort(latestFirst),
    cancelled: bookings.filter((b) => b.status === "cancelled" || b.status === "refunded").sort(latestFirst),
  };
}

export const statusTone = { upcoming: "success", done: "pending", cancelled: "danger", refunded: "info" } as const;

export const doctorName = (d: SampleDoctor, locale: Locale) => (locale === "ar" ? d.nameAr : d.nameEn);
export const specialtyName = (d: SampleDoctor, locale: Locale) => (locale === "ar" ? d.specialtyAr : d.specialtyEn);
