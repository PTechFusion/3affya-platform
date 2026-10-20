// Screen 20, checkout (docs/screens/20-checkout.md, tasks 3.2 and 3.3). One page, two blocks (layout call): Review (doctor, the
// time in both zones, visit type, edit links) and Pay (the three lines and the total, then Stripe's payment box), with the
// details and the two agreements between them and the hold timer pinned under the nav. Confirmation is a separate page
// (rule P2): a successful Pay goes to /patient/bookings/bk_004?state=confirmed (screen 21).
// Reads ?slot=<ISO-8601 UTC instant> (the contract with the picker), ?visit= ?for= ?age= and ?heldUntil= (the hold's end; a
// visit without it starts a fresh hold of business.slotHoldMinutes). Prototype switches:
//   ?state=loading    the skeleton, same as loading.tsx
//   ?state=expired    the hold has ended
//   ?state=failed     the card was declined; every answer kept
//   ?state=error      the payment service could not be reached; every answer kept
//   ?state=paying     the step list while Stripe takes the payment
//   ?state=taken      the time was booked by someone else while it was not held
//   ?state=notBookable  booking is not open (payouts not ready)
// No ?slot= gives "choose a time first"; a slot in the past gives "this time has passed". Viewer via ?tz= and ?country=.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { FeeBreakdown } from "@/components/brand/FeeBreakdown";
import { Breadcrumbs, LinkButton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { bookingRules, business } from "@/config/business";
import { feeLines } from "@/lib/fees";
import { formatMoney, formatNumber, formatPercent, formatSlotDay, formatTimeInZone, type Locale } from "@/lib/format";
import { doctorById, doctorTimeZone, samplePatient, sampleBookingAnswers, toDoctorCardData, visitMinutesFor } from "@/lib/sample";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { bookingQuery, keepFrom, parseAgeGroup, parseForWhom, parseSlot, parseVisit, slotParam } from "../_parts/booking";
import { Checkout, type CheckoutPhase } from "../_parts/Checkout";
import { DIAL_CODES, LOCATIONS, type Details } from "../_parts/details";
import { bookingDoctor, firstString, isBookable } from "../_parts/doctor";
import { CheckoutSkeleton } from "../_parts/skeletons";
import { BookingDeadEnd, NotBookable } from "../_parts/states";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ locale: string; doctorId: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false } };
}

const PHASES: Record<string, CheckoutPhase> = { failed: "failed", error: "error", paying: "paying", expired: "expired" };

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale, doctorId } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  const state = firstString(sp.state);
  if (state === "loading") return <CheckoutSkeleton />;

  const d = doctorById(doctorId);
  if (!d) return null; // the layout already answered 404
  const viewer = viewerFrom(sp);
  if (!isBookable(d) || state === "notBookable") return <NotBookable doctor={d} locale={loc} viewer={viewer} />;

  const t = await getTranslations("checkout");
  const tb = await getTranslations("book");
  const tn = await getTranslations("nav");
  const tcard = await getTranslations("card");
  const tl = await getTranslations("languages");
  const keep = keepFrom(sp);
  const doctor = bookingDoctor(d, loc);
  const tz = viewer.timeZone;
  const now = new Date();

  const visit = parseVisit(sp.visit, doctor.visitTypes);
  const forWhom = parseForWhom(sp.for);
  const ageGroup = parseAgeGroup(sp.age);
  const slot = parseSlot(sp.slot);
  const pickerHref = `/book/${d.id}${bookingQuery({ slot: slot ? slotParam(slot) : undefined, visit, forWhom, ageGroup, keep })}`;
  const crumbs = [
    { label: tn("doctors"), href: "/search" },
    { label: doctor.name, href: `/doctors/${d.id}` },
    { label: tb("crumb"), href: pickerHref },
    { label: t("crumb") },
  ];

  if (!slot) {
    return (
      <BookingDeadEnd
        doctor={d}
        locale={loc}
        viewer={viewer}
        crumbs={crumbs}
        title={t("noSlot.title")}
        body={t("noSlot.body", { name: doctor.name })}
        action={{ href: pickerHref, label: t("noSlot.action") }}
      />
    );
  }
  if (slot.getTime() <= now.getTime() || state === "taken") {
    const key = state === "taken" ? "taken" : "passed";
    const when = `${formatSlotDay(slot, tz, loc)}, ${formatTimeInZone(slot, tz, loc)}`;
    return (
      <BookingDeadEnd
        doctor={d}
        locale={loc}
        viewer={viewer}
        crumbs={crumbs}
        title={t(`${key}.title`)}
        body={t(`${key}.body`, { slot: when })}
        action={{ href: `/book/${d.id}${bookingQuery({ visit, forWhom, ageGroup, keep })}`, label: t(`${key}.action`) }}
      />
    );
  }

  // The hold: from ?heldUntil= (never longer than one hold from now), else a fresh one; ?state=expired has run out.
  const holdMs = business.slotHoldMinutes * 60_000;
  const asked = typeof sp.heldUntil === "string" ? Date.parse(sp.heldUntil) : Number.NaN;
  const heldUntil =
    state === "expired" ? now.getTime() - 1000 : Number.isNaN(asked) ? now.getTime() + holdMs : Math.min(asked, now.getTime() + holdMs);
  const remainingMs = Math.max(0, heldUntil - now.getTime());

  const dtz = doctorTimeZone(d);
  const minutes = visitMinutesFor(d.id);
  const fees = feeLines(d.feeUsdCents ?? 0);
  const money = (cents: number) => formatMoney(cents, business.currencyPresentment, loc);
  const total = money(fees.totalCents);
  const missing = !visit || !forWhom || !ageGroup;
  const hours = business.fullRefundCutoffHours;
  const ageGroupRule = bookingRules.ageGroups.find((g) => g.id === ageGroup);

  // "Keep details after an error" (rule P4): the failed and paying previews show a form already filled in.
  const filled = state === "failed" || state === "error" || state === "paying";
  const gulf = (LOCATIONS as readonly string[]).includes(viewer.country) ? (viewer.country as Details["location"]) : "";
  const dialCountry = DIAL_CODES.find((c) => c.country === viewer.country)?.country ?? "SA";
  const initialDetails: Details = filled
    ? {
        location: sampleBookingAnswers.locationCountry,
        phoneCountry: sampleBookingAnswers.phoneCountry,
        phone: sampleBookingAnswers.phoneNational,
        telehealth: true,
        cancellation: true,
      }
    : { location: gulf, phoneCountry: dialCountry, phone: "", telehealth: false, cancellation: false };

  const link = "inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-sea-700 underline-offset-2 hover:underline";
  const notChosen = <span className="text-ink-500">{t("review.notChosen")}</span>;
  const review = (
    <section aria-labelledby="review-title" className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-5">
      <h2 id="review-title" className="text-xl font-bold text-sea-900">
        {t("review.title")}
      </h2>
      <div className="mt-4">
        <DoctorCard doctor={toDoctorCardData(d, loc, tz, tl)} state="verified" size="mini" side="front" />
      </div>
      <dl className="mt-4 divide-y divide-sand-200 border-t border-sand-200">
        <div className="py-3">
          <dt className="text-sm text-ink-500">{t("review.time")}</dt>
          <dd className="mt-0.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* Rule P6: the patient's time first with the zone named, the doctor's own time second. */}
              <p className="font-semibold text-ink-900">
                {t("review.timeValue", { day: formatSlotDay(slot, tz, loc), time: formatTimeInZone(slot, tz, loc) })}
              </p>
              <p className="text-sm text-ink-700">
                {tb("calendar.doctorTime", { day: formatSlotDay(slot, dtz, loc), time: formatTimeInZone(slot, dtz, loc) })}
              </p>
              <p className="text-sm text-ink-500">{t("review.length", { minutes, minutesLabel: formatNumber(minutes, loc) })}</p>
            </div>
            <Link href={`${pickerHref}#book-slot`} className={link} aria-label={t("review.changeTime")}>
              {t("review.change")}
            </Link>
          </dd>
        </div>
        <div className="py-3">
          <dt className="text-sm text-ink-500">{t("review.visitType")}</dt>
          <dd className="mt-0.5 flex items-start justify-between gap-3">
            <p className="min-w-0 font-semibold text-ink-900">{visit ? tcard(visit) : notChosen}</p>
            {doctor.visitTypes.length > 1 ? (
              <Link href={`${pickerHref}#book-visit`} className={link} aria-label={t("review.changeVisit")}>
                {t("review.change")}
              </Link>
            ) : null}
          </dd>
        </div>
        <div className="py-3">
          <dt className="text-sm text-ink-500">{t("review.forWhom")}</dt>
          <dd className="mt-0.5 flex items-start justify-between gap-3">
            <p className="min-w-0 font-semibold text-ink-900">
              {forWhom && ageGroupRule
                ? t("review.forValue", { who: tb(`questions.forWhom.${forWhom}`), age: tb(`questions.age.${ageGroupRule.id}`) })
                : notChosen}
            </p>
            <Link href={`${pickerHref}#book-forWhom`} className={link} aria-label={t("review.changeFor")}>
              {t("review.change")}
            </Link>
          </dd>
        </div>
      </dl>
      {missing ? (
        <div className="mt-2 rounded-[var(--radius-field)] bg-gold-100 p-4">
          <p className="font-semibold text-ink-900">{t("review.missingTitle")}</p>
          <p className="mt-0.5 text-sm text-ink-700">{t("review.missingBody")}</p>
          <LinkButton href={pickerHref} variant="secondary" className="mt-3">
            {t("review.missingAction")}
          </LinkButton>
        </div>
      ) : null}
    </section>
  );

  // Rule P1: the same three lines as /fees, summing to the total charged; nothing new appears here.
  const feeTable = (
    <FeeBreakdown
      lines={[
        { label: t("pay.doctorFee"), detail: t("pay.doctorFeeDetail", { name: doctor.name }), amount: money(fees.doctorFeeCents) },
        {
          label: t("pay.platformFee"),
          detail: t("pay.platformFeeDetail", { pct: formatPercent(business.firstVisitPlatformFeePct, loc) }),
          amount: money(fees.platformFeeCents),
        },
        {
          label: t("pay.cardFee"),
          detail: t("pay.cardFeeDetail", { pct: formatPercent(business.cardProcessingPct, loc), fixed: money(business.cardProcessingFixedCents) }),
          amount: money(fees.cardProcessingCents),
        },
      ]}
      total={{ label: t("pay.total"), amount: total }}
    />
  );

  const header = (
    <>
      <Breadcrumbs label={tb("breadcrumb")} items={crumbs} />
      <h1 className="mt-2 text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
      {/* Rule P2: review must never read as confirmation. */}
      <p className="mt-1 text-ink-700">{t("lead")}</p>
    </>
  );

  return (
    <>
      <SiteNav />
      <Checkout
        doctor={{ id: d.id, name: doctor.name, gender: d.gender }}
        patientName={loc === "ar" ? samplePatient.firstNameAr : samplePatient.firstNameEn}
        slot={slotParam(slot)}
        answers={{ visit, forWhom, ageGroup }}
        missing={missing}
        hold={{ heldUntil: new Date(heldUntil).toISOString(), remainingMs }}
        warnMs={bookingRules.holdWarnMinutes * 60_000}
        initialPhase={(state && PHASES[state]) || "idle"}
        initialDetails={initialDetails}
        total={total}
        cutoffLabel={t("details.consent.cutoff", { hours, hoursLabel: formatNumber(hours, loc) })}
        emergencyNumber={emergencyNumberFor(viewer.country)}
        pickerHref={pickerHref}
        keep={keep}
        header={header}
        review={review}
        fees={feeTable}
      />
      <SiteFooter emergencyNumber={emergencyNumberFor(viewer.country)} />
    </>
  );
}
