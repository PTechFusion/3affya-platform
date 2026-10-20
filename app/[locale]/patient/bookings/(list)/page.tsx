// Screen 22, Bookings list (docs/screens/22-bookings-list.md, task 3.6). The patient portal's landing page after sign-in.
// Phone first: the heading, tabs Upcoming and Past, then on Upcoming the next visit as a larger card (Join, the time in the
// patient's zone with the zone named, the doctor's time secondary, rule P6) and the later visits; on Past the past visits,
// then the cancelled ones. Each row: doctor photo, date and time in the patient's zone, status chip, Join or View; a row
// opens /patient/bookings/[id] (screen 21). Cancel lives on the next-visit card behind Keep booking / Cancel booking (B10).
// Data: data/sample/bookings.json rows for the signed-in sample patient, Noura (bk_004 to bk_009). Viewer: ?tz= sets the zone.
// States: list (default); ?tab=past; ?state=empty (no bookings, one action, rule L3); ?state=loading (skeleton, as loading.tsx);
// ?state=error (the list did not load); ?state=noUpcoming and ?state=noPast (each tab's own empty state);
// ?cancelled=bk_004 (the list after cancelling the next visit, standing in for the row the action would write).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckIcon, EmptyState, LinkButton, Surface, TabLinks } from "@/components/ui";
import { business } from "@/config/business";
import { formatMoney, formatNumber, type Locale } from "@/lib/format";
import { BookingSection, NextVisit } from "../_parts/BookingList";
import { BookingsHeader, BookingsSkeleton } from "../_parts/BookingsSkeleton";
import { doctorName, groupBookings, listHref, patientBookings, patientZone, tabFrom, type SearchParams } from "../_parts/bookings";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bookings" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function BookingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const tab = tabFrom(sp);
  if (sp.state === "loading") return <BookingsSkeleton tab={tab} />;

  const loc = locale as Locale;
  const t = await getTranslations("bookings");
  const tc = await getTranslations("common");
  const header = <BookingsHeader title={t("title")} lead={t("lead")} />;

  if (sp.state === "error") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Surface className="flex flex-col items-start gap-4">
          <div role="alert">
            <h2 className="text-lg font-bold text-ink-900">{t("error.title")}</h2>
            <p className="mt-1 max-w-xl text-ink-700">{t("error.body")}</p>
          </div>
          <LinkButton href={listHref(sp, tab)}>{t("error.action")}</LinkButton>
        </Surface>
      </div>
    );
  }

  const now = new Date();
  const zone = patientZone(sp);
  const { bookings, justCancelled } = patientBookings(sp, now);
  const groups = groupBookings(bookings);
  const next = groups.upcoming[0];
  const pastCount = groups.past.length + groups.cancelled.length;
  const counted = (n: number) => (n ? formatNumber(n, loc) : undefined);
  const findDoctor = <LinkButton href="/search">{tc("findDoctor")}</LinkButton>;

  return (
    <div className="flex flex-col gap-6">
      {header}

      {justCancelled ? (
        <p role="status" className="flex items-start gap-2 rounded-[var(--radius-field)] bg-lagoon-100 px-4 py-3 font-semibold text-lagoon-900">
          <span aria-hidden="true" className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-lagoon-900">
            <CheckIcon className="size-4" />
          </span>
          {justCancelled.status === "refunded"
            ? t("cancelled.refunded", {
                name: doctorName(justCancelled.doctor, loc),
                amount: formatMoney(justCancelled.totalCents, business.currencyPresentment, loc),
              })
            : t("cancelled.noRefund", {
                name: doctorName(justCancelled.doctor, loc),
                hours: business.fullRefundCutoffHours,
                hoursLabel: formatNumber(business.fullRefundCutoffHours, loc),
              })}
        </p>
      ) : null}

      {bookings.length === 0 ? (
        <EmptyState title={t("empty.title")} body={t("empty.body")} action={findDoctor} />
      ) : (
        <>
          <TabLinks
            label={t("tabs.label")}
            items={[
              { href: listHref(sp, "upcoming"), label: t("tabs.upcoming"), count: counted(groups.upcoming.length), current: tab === "upcoming" },
              { href: listHref(sp, "past"), label: t("tabs.past"), count: counted(pastCount), current: tab === "past" },
            ]}
          />
          {tab === "upcoming" ? (
            next ? (
              <>
                <NextVisit
                  booking={next}
                  locale={loc}
                  zone={zone}
                  sp={sp}
                  now={now}
                  doneHref={listHref(sp, "upcoming", { cancelled: next.id })}
                />
                <BookingSection id="bookings-later" title={t("sections.later")} bookings={groups.upcoming.slice(1)} locale={loc} zone={zone} sp={sp} />
              </>
            ) : (
              <EmptyState title={t("emptyUpcoming.title")} body={t("emptyUpcoming.body")} action={findDoctor} />
            )
          ) : pastCount ? (
            <>
              <BookingSection id="bookings-past" title={t("sections.past")} bookings={groups.past} locale={loc} zone={zone} sp={sp} />
              <BookingSection id="bookings-cancelled" title={t("sections.cancelled")} bookings={groups.cancelled} locale={loc} zone={zone} sp={sp} />
            </>
          ) : (
            <EmptyState
              title={t("emptyPast.title")}
              body={t("emptyPast.body")}
              action={<LinkButton href={listHref(sp, "upcoming")}>{t("emptyPast.action")}</LinkButton>}
            />
          )}
        </>
      )}
    </div>
  );
}
