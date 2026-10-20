// The bookings list (screen 22): the next visit as a larger card, then rows. A row is the doctor's photo, name and status chip,
// the date and time in the patient's zone (zone named, rule P6), and Join or View. The whole row opens the booking through one
// stretched link on the doctor's name; Join is its own sibling link above it, so no interactive element is nested.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, ChevronNext, LinkButton, Surface, When, nowrap } from "@/components/ui";
import { business } from "@/config/business";
import { formatDate, formatMoney, formatNumber, formatSlotDay, formatTime, formatTimeInZone, formatZone, type Locale } from "@/lib/format";
import type { PatientBooking } from "@/lib/sample";
// The inbox (screen 32) already renders a visit's day, time and named zone this way; one rendering for both portals.
import { bookingHref, doctorName, specialtyName, statusTone, type SearchParams } from "./bookings";
import { refundsInFull } from "@/lib/refunds";
import { CancelBooking } from "./CancelBooking";

type T = Awaited<ReturnType<typeof getTranslations>>;

/** The doctor's external meeting link (handoff: no hosted video). */
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Doctor photo at the reading start of a row or card. Photos never mirror (rule R2). */
function DoctorPhoto({ url, className }: { url: string | null; className: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={`${className} shrink-0 rounded-2xl bg-sand-100 object-cover`} />
  ) : (
    <div aria-hidden="true" className={`${className} shrink-0 rounded-2xl bg-sand-100`} />
  );
}

const hoursArgs = (locale: Locale) => ({
  hours: business.fullRefundCutoffHours,
  hoursLabel: formatNumber(business.fullRefundCutoffHours, locale),
});

export async function NextVisit({
  booking: b,
  locale,
  zone,
  sp,
  doneHref,
  now,
}: {
  booking: PatientBooking;
  locale: Locale;
  zone: string;
  sp: SearchParams;
  doneHref: string;
  now: Date;
}) {
  const t = await getTranslations("bookings");
  const name = doctorName(b.doctor, locale);
  const canCancel = b.startsAt.getTime() > now.getTime();
  const amount = formatMoney(b.totalCents, business.currencyPresentment, locale);
  return (
    <section aria-labelledby="next-visit">
      <Surface className="sm:p-6">
        <h2 id="next-visit" className="text-sm font-semibold text-lagoon-800">
          {t("next.title")}
        </h2>
        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink-900">{formatSlotDay(b.startsAt, zone, locale)}</p>
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="tabular whitespace-nowrap text-4xl font-bold leading-tight text-sea-900">{formatTime(b.startsAt, zone, locale)}</span>
              <span className="ltr-run text-sm font-medium text-ink-500">{formatZone(b.startsAt, zone)}</span>
            </p>
            <p className="mt-1 text-sm text-ink-700">
              {t.rich("next.doctorTime", {
                day: formatSlotDay(b.startsAt, b.doctorTimeZone, locale),
                time: formatTimeInZone(b.startsAt, b.doctorTimeZone, locale),
                nowrap,
              })}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <DoctorPhoto url={b.doctor.photoUrl} className="size-14" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-snug text-ink-900">{name}</p>
                <p className="text-sm text-ink-700">
                  {specialtyName(b.doctor, locale)} · {t(`visitType.${b.visitType}`)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            {b.joinUrl ? (
              <LinkButton href={b.joinUrl} {...external} size="lg">
                {t(b.visitType === "phone" ? "next.joinPhone" : "next.joinVideo")}
              </LinkButton>
            ) : null}
            <LinkButton href={bookingHref(b.id, sp)} variant="secondary" size="lg">
              {t("next.view")}
            </LinkButton>
          </div>
        </div>
        {canCancel ? (
          <div className="mt-4 border-t border-sand-200 pt-2">
            <CancelBooking
              id={b.id}
              doneHref={doneHref}
              summary={
                <>
                  {name} · <When instant={b.startsAt} timeZone={zone} locale={locale} />
                </>
              }
              refundNote={
                refundsInFull(b.startsAt, now) ? t("cancel.refundFull", { amount }) : t("cancel.refundNone", hoursArgs(locale))
              }
            />
          </div>
        ) : null}
      </Surface>
    </section>
  );
}

/** One titled group of rows (Later visits, Past visits, Cancelled), with its count. */
export async function BookingSection({
  id,
  title,
  bookings,
  locale,
  zone,
  sp,
}: {
  id: string;
  title: string;
  bookings: PatientBooking[];
  locale: Locale;
  zone: string;
  sp: SearchParams;
}) {
  const t = await getTranslations("bookings");
  if (!bookings.length) return null;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 flex items-center gap-2 text-lg font-bold text-sea-900">
        {title}
        <Badge tone="pending">
          <span className="tabular">{formatNumber(bookings.length, locale)}</span>
        </Badge>
      </h2>
      <Surface>
        <ul className="@container -my-4 divide-y divide-sand-200">
          {bookings.map((b) => (
            <Row key={b.id} booking={b} locale={locale} zone={zone} sp={sp} t={t} />
          ))}
        </ul>
      </Surface>
    </section>
  );
}

function cancelNote(b: PatientBooking, locale: Locale, zone: string, t: T): string | null {
  if (!b.cancelledAt) return null;
  const date = formatDate(b.cancelledAt, zone, locale);
  if (b.cancelledBy === "doctor") return t("cancelNote.doctor", { date });
  return b.status === "refunded" ? t("cancelNote.patientRefunded", { date }) : t("cancelNote.patientLate", { date, ...hoursArgs(locale) });
}

function Row({ booking: b, locale, zone, sp, t }: { booking: PatientBooking; locale: Locale; zone: string; sp: SearchParams; t: T }) {
  const name = doctorName(b.doctor, locale);
  const join = b.status === "upcoming" ? b.joinUrl : null;
  const note = cancelNote(b, locale, zone, t);
  // Phone: name and status beside Join, then the specialty and the time across the full width under them. Wide (@2xl): one
  // line per row, photo | name, status and specialty | time | Join or View.
  return (
    <li className="relative grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-4 @2xl:grid-cols-[3.5rem_minmax(0,2fr)_minmax(0,3fr)_7rem] @2xl:gap-x-4">
      <DoctorPhoto url={b.doctor.photoUrl} className="col-start-1 row-span-3 row-start-1 size-12 self-start @2xl:row-span-2 @2xl:row-start-1 @2xl:size-14 @2xl:self-center" />
      <div className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <Link
          href={bookingHref(b.id, sp)}
          className="font-semibold text-sea-900 underline-offset-2 after:absolute after:inset-0 after:rounded-[var(--radius-field)] hover:underline"
        >
          {name}
        </Link>
        <Badge tone={statusTone[b.status]}>{t(`status.${b.status}`)}</Badge>
      </div>
      <p className="col-span-2 col-start-2 row-start-2 text-sm text-ink-700 @2xl:col-span-1 @2xl:col-start-2 @2xl:self-start">
        {specialtyName(b.doctor, locale)} · {t(`visitType.${b.visitType}`)}
      </p>
      <div className="col-span-2 col-start-2 row-start-3 text-sm @2xl:col-span-1 @2xl:col-start-3 @2xl:row-span-2 @2xl:row-start-1">
        <p className="font-semibold text-ink-900">
          <When instant={b.startsAt} timeZone={zone} locale={locale} />
        </p>
        {note ? <p className="mt-0.5 text-ink-700">{note}</p> : null}
      </div>
      <div className="col-start-3 row-start-1 flex justify-end @2xl:col-start-4 @2xl:row-span-2 @2xl:row-start-1">
        {join ? (
          <LinkButton href={join} {...external} aria-label={t("joinLabel", { name })} className="relative z-10">
            {t("join")}
          </LinkButton>
        ) : (
          // The row itself is the link (the doctor's name, stretched); this only shows where the tap goes.
          <span aria-hidden="true" className="inline-flex min-h-12 items-center gap-1 text-[15px] font-semibold text-sea-700">
            {t("view")}
            <ChevronNext className="size-4" />
          </span>
        )}
      </div>
    </li>
  );
}
