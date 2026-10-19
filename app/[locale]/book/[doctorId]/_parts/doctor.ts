// Server-side doctor facts both booking pages need: whether the doctor can take a booking, the names in the page language and
// the shape the client parts receive.
import type { Locale } from "@/lib/format";
import type { SampleDoctor } from "@/lib/sample";
import type { VisitType } from "./booking";
import type { BookingDoctor } from "./fields";

/** Booking opens only for a verified doctor with a published fee and at least one visit type (rules U1, U2; task 3.1 adds
 *  payouts ready, which the prototype stands in for with ?state=notBookable). */
export function isBookable(d: SampleDoctor): boolean {
  return d.state === "verified" && d.feeUsdCents != null && d.visitTypes.length > 0;
}

export function bookingDoctor(d: SampleDoctor, locale: Locale): BookingDoctor {
  const ar = locale === "ar";
  return {
    id: d.id,
    name: ar ? d.nameAr : d.nameEn,
    gender: d.gender,
    specialty: ar ? d.specialtyAr : d.specialtyEn,
    specialtySlug: d.specialty,
    visitTypes: d.visitTypes as VisitType[],
    ages: d.ages,
  };
}

export const firstString = (v: string | string[] | undefined): string | undefined => (typeof v === "string" ? v : undefined);
