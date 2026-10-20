// Add to calendar (screen 21, task 3.3): the booking as an .ics file. Served from a URL rather than a data: link so iPhone Safari
// offers "Add to Calendar" straight away (rule G5: iOS is about half of Saudi mobile traffic). Only an upcoming booking has a
// calendar file; anything else is 404. Production reads the booking through RLS, so only its own patient can fetch it.
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { toIcs } from "@/lib/ics";
import { doctorById, patientBookingById } from "@/lib/sample";
import { emergencyNumberFor } from "@/lib/viewer";
import { calendarEventFor, originFrom, patientCountry } from "../_parts/booking";

export async function GET(request: Request, { params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: requested, id } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const booking = patientBookingById(id);
  const doctor = booking ? doctorById(booking.doctorId) : undefined;
  if (!booking || !doctor || booking.status !== "upcoming" || booking.endsAt.getTime() <= Date.now()) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const t = await getTranslations({ locale, namespace: "booking" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const event = calendarEventFor({
    booking,
    doctorName: locale === "ar" ? doctor.nameAr : doctor.nameEn,
    doctorGender: doctor.gender,
    pageUrl: `${originFrom(request.headers)}/${locale}/patient/bookings/${booking.id}`,
    emergencyNumber: emergencyNumberFor(patientCountry(booking.patientTimeZone, {})),
    t,
    tc,
  });

  return new Response(toIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="3affya-${booking.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
