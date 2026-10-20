// The appointment card of screen 21: who, then when in both zones (rule P6: the patient's own time first and largest, the zone
// named; the doctor's time second and smaller), how far away and how long (P10), then whatever the view needs under a rule:
// the join link, the phone call line, or what happened to the booking. Mirrors the two time boxes of the professional's inbox
// detail (screen 32) from the patient's side. The doctor line is a reference to the profile, not a doctor card.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Surface } from "@/components/ui";
import { formatNumber, formatSlotDay, formatTime, formatZone, type Locale } from "@/lib/format";
import type { PatientBooking, SampleDoctor } from "@/lib/sample";
import { daysUntil } from "./booking";

export async function Appointment({
  booking: b,
  doctor,
  zone,
  locale,
  upcoming,
  children,
}: {
  booking: PatientBooking;
  doctor: SampleDoctor;
  zone: string;
  locale: Locale;
  /** Shows how far away the visit is and how long it lasts. */
  upcoming: boolean;
  children?: React.ReactNode;
}) {
  const t = await getTranslations("booking");
  const name = locale === "ar" ? doctor.nameAr : doctor.nameEn;
  const specialty = locale === "ar" ? doctor.specialtyAr : doctor.specialtyEn;
  const days = daysUntil(b.startsAt, zone);
  const when = days <= 0 ? t("card.today") : days === 1 ? t("card.tomorrow") : t("card.inDays", { days, daysLabel: formatNumber(days, locale) });
  const length = t("card.length", { minutes: b.durationMinutes, minutesLabel: formatNumber(b.durationMinutes, locale) });

  return (
    <section aria-labelledby="appointment-title">
      <Surface>
        <h2 id="appointment-title" className="sr-only">
          {t("card.title")}
        </h2>
        <div className="flex items-center gap-3">
          {doctor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doctor.photoUrl} alt="" className="size-12 shrink-0 rounded-2xl bg-sand-100 object-cover sm:size-14" />
          ) : (
            <div aria-hidden="true" className="size-12 shrink-0 rounded-2xl bg-sand-100 sm:size-14" />
          )}
          <div className="min-w-0">
            <p className="text-lg font-bold leading-snug text-ink-900">
              <Link href={`/doctors/${doctor.id}`} className="hover:text-sea-700 hover:underline">
                {name}
              </Link>
            </p>
            <p className="text-[15px] leading-snug text-ink-700">
              <span className="font-semibold text-sea-800">{specialty}</span> · {t(`visitType.${b.visitType}`)}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-[var(--radius-field)] bg-sea-100 p-3">
            <dt className="text-sm font-semibold text-sea-800">{t("card.yourTime")}</dt>
            <dd className="mt-0.5 text-ink-900">{formatSlotDay(b.startsAt, zone, locale)}</dd>
            <dd className="flex flex-wrap items-baseline gap-x-2">
              <span className="tabular whitespace-nowrap text-2xl font-bold text-sea-900">{formatTime(b.startsAt, zone, locale)}</span>
              <span className="ltr-run text-sm text-ink-700">{formatZone(b.startsAt, zone)}</span>
            </dd>
            {upcoming ? <dd className="mt-1 text-sm font-semibold text-sea-800">{`${when} · ${length}`}</dd> : null}
          </div>
          {/* The doctor's time is secondary: one wrapping line under its label, so a long zone ("Los Angeles (GMT−8)") never
              has to fit a half-width box on a phone. */}
          <div className="min-w-0 rounded-[var(--radius-field)] bg-sand-100 p-3">
            <dt className="text-sm font-semibold text-ink-700">{t("card.doctorTime", { gender: doctor.gender })}</dt>
            <dd className="mt-0.5 text-sm text-ink-700">
              {formatSlotDay(b.startsAt, b.doctorTimeZone, locale)} ·{" "}
              <span className="tabular whitespace-nowrap font-semibold text-ink-900">{formatTime(b.startsAt, b.doctorTimeZone, locale)}</span>{" "}
              <span className="ltr-run">{formatZone(b.startsAt, b.doctorTimeZone)}</span>
            </dd>
          </div>
        </dl>

        {children ? <div className="mt-4 border-t border-sand-200 pt-4">{children}</div> : null}
      </Surface>
    </section>
  );
}
