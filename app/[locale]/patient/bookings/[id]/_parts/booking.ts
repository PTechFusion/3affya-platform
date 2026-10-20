// Shared bits of the booking page (screen 21) and its .ics route: which view a booking shows, the patient's zone and country,
// the free-cancellation cutoff, and the one calendar event both the page's Google link and the .ics file carry.
import type { CalendarEvent } from "@/lib/ics";
import { samplePatient, type PatientBooking } from "@/lib/sample";
import { zonedParts } from "@/lib/slots";
import { gulfTimeZones, viewerFrom } from "@/lib/viewer";

export type SearchParams = Record<string, string | string[] | undefined>;

/** confirmed: the arrival from checkout (?state=confirmed); upcoming: the same booking opened later; done; cancelled. */
export type BookingView = "confirmed" | "upcoming" | "done" | "cancelled";

export function bookingView(b: PatientBooking, sp: SearchParams, now: Date = new Date()): BookingView {
  if (b.status === "cancelled" || b.status === "refunded") return "cancelled";
  if (b.status === "done" || b.endsAt.getTime() <= now.getTime()) return "done";
  return sp.state === "confirmed" ? "confirmed" : "upcoming";
}

/**
 * The patient's zone (rule P6): ?tz= when the prototype viewer sets one, otherwise the signed-in patient's current setting. The
 * zone stored with the booking is the snapshot the doctor's inbox shows; the patient side recomputes every render.
 */
export function patientZone(sp: SearchParams): string {
  return typeof sp.tz === "string" ? viewerFrom(sp).timeZone : samplePatient.timeZone;
}

/** The country for the emergency number (rule H14): ?country= when set, else the Gulf country of the patient's zone, else the
 *  signed-in patient's own country. */
export function patientCountry(timeZone: string, sp: SearchParams): string {
  if (typeof sp.country === "string") return viewerFrom(sp).country;
  return Object.entries(gulfTimeZones).find(([, zone]) => zone === timeZone)?.[0] ?? samplePatient.country;
}

/** Calendar days from today to the visit day on the patient's own calendar: 0 today, 1 tomorrow. */
export function daysUntil(instant: Date, timeZone: string, now: Date = new Date()): number {
  const day = (d: Date) => {
    const p = zonedParts(d, timeZone);
    return Date.UTC(p.year, p.month - 1, p.day);
  };
  return Math.round((day(instant) - day(now)) / 86_400_000);
}

/** Scheme and host of the request, for the absolute links a calendar entry needs. */
export function originFrom(headers: Headers): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost";
  const proto = headers.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The visit as a calendar entry: title, how to join (or that the doctor rings), the phone fallback, a link back to this page
 * and the not-for-emergencies line, in the page locale. Times are UTC, so the calendar shows them in the device's own zone.
 */
export function calendarEventFor({
  booking: b,
  doctorName,
  doctorGender,
  pageUrl,
  emergencyNumber,
  t,
  tc,
}: {
  booking: PatientBooking;
  doctorName: string;
  doctorGender: string;
  pageUrl: string;
  emergencyNumber: string;
  t: Translate;
  tc: Translate;
}): CalendarEvent {
  const who = { name: doctorName, gender: doctorGender };
  const how = b.joinUrl ? [t("ics.join", { url: b.joinUrl }), t("join.fallback", who)] : [t("ics.phone", who)];
  return {
    uid: `${b.id}@3affya.com`,
    start: b.startsAt,
    end: b.endsAt,
    title: t("ics.title", { visitType: b.visitType, name: doctorName }),
    description: [...how, t("ics.booking", { url: pageUrl }), tc("notForEmergenciesWithNumber", { number: emergencyNumber })].join("\n"),
    location: b.joinUrl ?? t("ics.phoneLocation"),
    url: pageUrl,
  };
}
