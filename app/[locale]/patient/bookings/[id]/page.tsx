// Screen 21, booking confirmation (docs/screens/21-booking-confirmation.md, task 3.3). The peak and the end of booking (rule
// P10). Phone order, as the layout call has it: green check and one line, the appointment card (both zones, join link), Add to
// calendar, the three-item prepare list led by Test your device (the hook, rule G4), the share-records prompt with its AI
// consent and who will see them (T3, T7), the receipt link; then how to change or cancel, and the not-for-emergencies line
// with the local number (H14). Desktop puts the last four in a column beside the first.
//
// Sample ids (data/sample/bookings.json): bk_001 upcoming video visit (default), bk_211 upcoming phone visit, bk_002 done,
// bk_003 cancelled; any other id shows the not-found state. ?state=confirmed is the arrival from checkout; ?state=loading the
// skeleton. ?tz= and ?country= set the patient's zone and emergency number (lib/viewer).
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, Breadcrumbs, CheckIcon, ChevronNext, EmptyState, LinkButton, Surface, When, nowrap } from "@/components/ui";
import { business } from "@/config/business";
import { formatDate, formatMoney, formatNumber, formatSlotDay, formatTimeInZone, type Locale } from "@/lib/format";
import { googleCalendarUrl } from "@/lib/ics";
import { fullRefundDeadline, refundsInFull } from "@/lib/refunds";
import { doctorById, patientBookingById } from "@/lib/sample";
import { emergencyNumberFor } from "@/lib/viewer";
import { Appointment } from "./_parts/Appointment";
import { CancelBooking } from "../_parts/CancelBooking";
import { DeviceCheck } from "./_parts/DeviceCheck";
import { bookingView, calendarEventFor, daysUntil, originFrom, patientCountry, patientZone, type SearchParams } from "./_parts/booking";
import Loading from "./loading";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "booking" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

const sectionTitle = "text-lg font-bold text-sea-900";

export default async function BookingPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const loc = locale as Locale;
  const t = await getTranslations("booking");
  const tc = await getTranslations("common");
  const tp = await getTranslations("portal");
  const bookingsLabel = tp("patient.nav.bookings");

  // Production reads the booking through RLS, so another patient's booking is simply not found.
  const booking = patientBookingById(id);
  const doctor = booking ? doctorById(booking.doctorId) : undefined;
  if (!booking || !doctor) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{bookingsLabel}</h1>
        <EmptyState
          title={t("notFound.title")}
          body={t("notFound.body")}
          action={<LinkButton href="/patient/bookings">{t("notFound.action")}</LinkButton>}
        />
      </div>
    );
  }

  const view = bookingView(booking, sp);
  const zone = patientZone(sp);
  const country = patientCountry(zone, sp);
  const emergencyNumber = emergencyNumberFor(country);
  const name = loc === "ar" ? doctor.nameAr : doctor.nameEn;
  const who = { name, gender: doctor.gender };
  const upcoming = view === "confirmed" || view === "upcoming";
  const total = formatMoney(booking.paid.totalCents, business.currencyPresentment, loc);
  const hours = business.fullRefundCutoffHours;
  const hoursLabel = formatNumber(hours, loc);
  const cutoff = fullRefundDeadline(booking.startsAt);
  const refundable = refundsInFull(booking.startsAt);
  const bookAgainHref = `/book/${doctor.id}`;

  const pageUrl = `${originFrom(await headers())}/${loc}/patient/bookings/${booking.id}`;
  const event = calendarEventFor({ booking, doctorName: name, doctorGender: doctor.gender, pageUrl, emergencyNumber, t, tc });
  // The join button leads on the visit day; before that, the calendar and the device test are the next things to do.
  const visitDay = daysUntil(booking.startsAt, zone) <= 0;

  const statusTone = { upcoming: "success", done: "pending", cancelled: "danger" } as const;

  return (
    <div className="flex flex-col gap-5">
      {view === "confirmed" ? (
        <header className="flex items-center gap-3">
          <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <CheckIcon className="size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("confirmed.title")}</h1>
            <p className="text-sm text-ink-700">{t("confirmed.body")}</p>
          </div>
        </header>
      ) : (
        <header>
          <Breadcrumbs
            label={t("breadcrumb")}
            items={[{ label: tp("patient.title"), href: "/patient" }, { label: bookingsLabel, href: "/patient/bookings" }, { label: t("crumb", { name }) }]}
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
            <Badge tone={statusTone[view]}>{t(`status.${view}`)}</Badge>
          </div>
        </header>
      )}

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <Appointment booking={booking} doctor={doctor} zone={zone} locale={loc} upcoming={upcoming}>
            {upcoming && booking.joinUrl ? (
              <>
                <LinkButton
                  href={booking.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant={visitDay ? "primary" : "secondary"}
                  className="w-full sm:w-auto"
                >
                  {t("join.button")}
                </LinkButton>
                <p className="mt-2 text-sm text-ink-700">
                  {t("join.help")} {t("join.fallback", who)}
                </p>
              </>
            ) : upcoming ? (
              <p className="text-sm text-ink-700">{t("join.phone", who)}</p>
            ) : view === "cancelled" ? (
              <>
                <p className="text-sm text-ink-700">
                  {booking.cancelledAt ? `${t("cancelled.on", { date: formatDate(booking.cancelledAt, zone, loc) })} ` : null}
                  {booking.status === "refunded"
                    ? t("cancelled.refund", { amount: total, hours, hoursLabel })
                    : t("cancelled.noRefund", { hours, hoursLabel })}
                </p>
                <LinkButton href={bookAgainHref} className="mt-4 w-full sm:w-auto">
                  {t("cancelled.action", { name })}
                </LinkButton>
              </>
            ) : (
              <p className="text-sm text-ink-700">{t("done.body")}</p>
            )}
          </Appointment>

          {upcoming ? (
            <>
              <div className="flex flex-wrap gap-2">
                <LinkButton
                  href={`/patient/bookings/${booking.id}/calendar.ics`}
                  prefetch={false}
                  download={`3affya-${booking.id}.ics`}
                  variant="secondary"
                  className="flex-1 sm:flex-none"
                >
                  {t("calendar.add")}
                </LinkButton>
                <LinkButton href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" variant="ghost" className="flex-1 sm:flex-none">
                  {t("calendar.google")}
                </LinkButton>
              </div>

              <section aria-labelledby="prepare-title">
                <Surface>
                  <h2 id="prepare-title" className={sectionTitle}>
                    {t("prepare.title")}
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">{t("prepare.lead")}</p>
                  <ol className="mt-4 flex flex-col gap-4">
                    {(booking.visitType === "video" ? (["device", "room", "id"] as const) : (["phone", "room", "id"] as const)).map((key, i) => (
                      <li
                        key={key}
                        className={["flex items-start gap-3", key === "device" ? "rounded-[var(--radius-field)] bg-lagoon-100 p-3" : ""].join(" ")}
                      >
                        <span aria-hidden="true" className="tabular inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sea-700 text-sm font-bold text-white">
                          {formatNumber(i + 1, loc)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink-900">{t(`prepare.${key}.title`)}</p>
                          <p className="text-sm text-ink-700">{t(`prepare.${key}.body`)}</p>
                          {key === "device" ? <DeviceCheck /> : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </Surface>
              </section>
            </>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {upcoming ? (
            <section aria-labelledby="share-title">
              <Surface>
                <h2 id="share-title" className={sectionTitle}>
                  {t("share.title", who)}
                </h2>
                <p className="mt-1 text-[15px] text-ink-700">{t("share.body", who)}</p>
                <dl className="mt-3 flex flex-col gap-2 text-sm">
                  <div>
                    <dt className="font-semibold text-ink-900">{t("share.aiLabel")}</dt>
                    <dd className="text-ink-700">{t("share.ai")}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-900">{t("share.whoLabel")}</dt>
                    <dd className="text-ink-700">
                      {t("share.who", { ...who, days: business.shareDefaultDays, daysLabel: formatNumber(business.shareDefaultDays, loc) })}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-900">{t("share.priceLabel")}</dt>
                    <dd className="text-ink-700">
                      {t("share.price", {
                        price: formatMoney(business.recordsBlockPriceCents, business.currencyPresentment, loc),
                        gb: business.recordsBlockGb,
                        gbLabel: formatNumber(business.recordsBlockGb, loc),
                      })}
                    </dd>
                  </div>
                </dl>
                <LinkButton href="/patient/records" variant="secondary" className="mt-4 w-full sm:w-auto">
                  {t("share.action")}
                </LinkButton>
              </Surface>
            </section>
          ) : null}

          {/* The whole row is the link (text only inside, nothing nested). */}
          <Link
            href={`/patient/receipts/${booking.id}`}
            className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--radius-card)] border border-sand-200 bg-white p-5 transition-colors hover:border-lagoon-600"
          >
            <span className="min-w-0">
              <span className="block font-bold text-sea-900">{t("receipt.title")}</span>
              <span className="block text-sm text-ink-700">{t("receipt.paid", { amount: total })}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-sea-700">
              {t("receipt.view")}
              <ChevronNext />
            </span>
          </Link>

          {upcoming ? (
            <section aria-labelledby="change-title">
              <Surface>
                <h2 id="change-title" className={sectionTitle}>
                  {t("change.title")}
                </h2>
                <p className="mt-1 text-sm text-ink-700">
                  {refundable
                    ? t.rich("change.before", {
                        day: formatSlotDay(cutoff, zone, loc),
                        time: formatTimeInZone(cutoff, zone, loc),
                        amount: total,
                        hours,
                        hoursLabel,
                        nowrap,
                      })
                    : t("change.after", { hours, hoursLabel })}
                </p>
                <p className="mt-2 text-sm text-ink-700">{t("change.move")}</p>
                {/* One cancel flow for the portal (screen 22's dialog and action): the result shows on the list. */}
                <div className="mt-3 border-t border-sand-200 pt-2">
                  <CancelBooking
                    id={booking.id}
                    doneHref={`/patient/bookings?cancelled=${booking.id}${typeof sp.tz === "string" ? `&tz=${encodeURIComponent(sp.tz)}` : ""}`}
                    summary={
                      <>
                        {name} · <When instant={booking.startsAt} timeZone={zone} locale={loc} />
                      </>
                    }
                    refundNote={refundable ? t("cancel.refund", { amount: total }) : t("cancel.noRefund", { amount: total, hours, hoursLabel })}
                  />
                </div>
              </Surface>
            </section>
          ) : null}

          <p role="note" className="rounded-[var(--radius-field)] border border-danger/40 bg-white p-4 text-sm font-semibold text-ink-900">
            {tc("notForEmergenciesWithNumber", { number: emergencyNumber })}
          </p>
        </div>
      </div>
    </div>
  );
}
