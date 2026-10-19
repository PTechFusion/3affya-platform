// Screen 19, slot picker (docs/screens/19-slot-picker.md, task 3.2). The doctor's open times in the patient's zone, the zone
// named (rule P6), weekends shaded for the patient's country (P7), the questions asked before the hold (P8), then checkout at
// /book/[doctorId]/pay?slot=<ISO UTC instant>&visit=&for=&age=&heldUntil=. Prototype switches:
//   ?slot=<ISO>               a time tapped on the profile, pre-selected (an unknown time is ignored)
//   ?visit= ?for= ?age=       answers carried back from checkout's Change links
//   ?state=loading            the skeleton, same as loading.tsx
//   ?state=held               the hold has started (sample answers, the timer running)
//   ?state=taken              the chosen time was just booked by someone else
//   ?state=noSlotsThisWeek    this week's times removed, so the picker opens on the next open week
//   ?state=notBookable        payouts not ready: booking is not open (unclaimed and pending doctors are never bookable)
//   ?step=request             Request a time; with &state=sent, the request was sent
// Data: doc_002 (default), doc_005 (no times in the first two weeks), doc_006 (video only), doc_001 and doc_007 (no times at
// all), doc_013 (unclaimed). Viewer zone and country via ?tz= and ?country= (lib/viewer.ts).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { EmptyState, LinkButton } from "@/components/ui";
import { business } from "@/config/business";
import { feeLines } from "@/lib/fees";
import { formatMoney, formatZone, type Locale } from "@/lib/format";
import { addDays, zonedInstant, zonedParts } from "@/lib/slots";
import { bookableSlots, doctorById, doctorTimeZone, sampleBookingAnswers, toDoctorCardData } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { bookingQuery, keepFrom, parseAgeGroup, parseForWhom, parseSlot, parseVisit, slotParam, type Answers } from "../_parts/booking";
import { buildWeeks, weekOf } from "../_parts/calendar";
import { bookingDoctor, firstString, isBookable } from "../_parts/doctor";
import { RequestTime } from "../_parts/RequestTime";
import { PickerSkeleton } from "../_parts/skeletons";
import { SlotPicker } from "../_parts/SlotPicker";
import { BookingFrame, NotBookable } from "../_parts/states";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ locale: string; doctorId: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale, doctorId } = await params;
  const t = await getTranslations({ locale, namespace: "book" });
  const d = doctorById(doctorId);
  if (!d) return {};
  const name = locale === "ar" ? d.nameAr : d.nameEn;
  return { title: t("metaTitle", { name }), description: t("metaDescription", { name }), robots: { index: false } };
}

export default async function SlotPickerPage({ params, searchParams }: Props) {
  const { locale, doctorId } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  const state = firstString(sp.state);
  const step = firstString(sp.step);
  if (state === "loading") return <PickerSkeleton />;

  const d = doctorById(doctorId);
  if (!d) return null; // the layout already answered 404
  const viewer = viewerFrom(sp);
  if (!isBookable(d) || state === "notBookable") return <NotBookable doctor={d} locale={loc} viewer={viewer} />;

  const t = await getTranslations("book");
  const tn = await getTranslations("nav");
  const tl = await getTranslations("languages");
  const keep = keepFrom(sp);
  const doctor = bookingDoctor(d, loc);
  const tz = viewer.timeZone;
  const now = new Date();
  const pickerHref = `/book/${d.id}${bookingQuery({ keep })}`;
  const profileHref = `/doctors/${d.id}`;
  const crumbs = (current: string, parent?: { label: string; href: string }) => [
    { label: tn("doctors"), href: "/search" },
    { label: doctor.name, href: profileHref },
    ...(parent ? [parent] : []),
    { label: current },
  ];
  const cardData = toDoctorCardData(d, loc, tz, tl);
  const card = <DoctorCard doctor={cardData} state="verified" size="mini" side="front" />;
  const answers: Answers = {
    visit: parseVisit(sp.visit, doctor.visitTypes),
    forWhom: parseForWhom(sp.for),
    ageGroup: parseAgeGroup(sp.age),
    reason: "",
  };

  if (step === "request") {
    return (
      <BookingFrame
        crumbs={crumbs(t("request.crumb"), { label: t("crumb"), href: pickerHref })}
        title={t("request.title", { name: doctor.name })}
        lead={state === "sent" ? undefined : t("request.lead", { name: doctor.name })}
        country={viewer.country}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-12">
          <aside className="lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1">{card}</aside>
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <RequestTime
              doctor={doctor}
              zone={formatZone(now, tz)}
              initialAnswers={answers}
              initialSent={state === "sent"}
              profileHref={profileHref}
            />
          </div>
        </div>
      </BookingFrame>
    );
  }

  let slots = bookableSlots(d.id, now);
  if (state === "noSlotsThisWeek") {
    const weekEnd = zonedInstant(addDays(zonedParts(now, tz), 7), 0, tz);
    slots = slots.filter((s) => s >= weekEnd);
  }

  // No open time at all (doc_001, doc_007): say so, with one action (rule L3).
  if (!slots.length) {
    return (
      <BookingFrame crumbs={crumbs(t("crumb"))} title={t("title")} country={viewer.country}>
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          {card}
          <EmptyState
            title={t("empty.title")}
            body={t("empty.body", { name: doctor.name, gender: doctor.gender })}
            action={<LinkButton href={`/book/${d.id}${bookingQuery({ extra: { step: "request" }, keep })}`}>{t("empty.action")}</LinkButton>}
          />
        </div>
      </BookingFrame>
    );
  }

  const weeks = buildWeeks({
    slots,
    now,
    timeZone: tz,
    weekend: business.weekend[viewer.country] ?? [],
    doctorTimeZone: doctorTimeZone(d),
    locale: loc,
    maxWeeks: Math.ceil(business.bookingHorizonDays / 7),
    t: (key, values) => t(key, values),
  });

  const asked = parseSlot(sp.slot);
  let initialSlot = asked && slots.some((s) => s.getTime() === asked.getTime()) ? slotParam(asked) : undefined;
  let takenSlot: string | undefined;
  let held: { heldUntil: string; remainingMs: number } | undefined;
  let initialAnswers = answers;
  if (state === "taken") {
    takenSlot = initialSlot ?? (slots[0] ? slotParam(slots[0]) : undefined);
    initialSlot = undefined;
  } else if (state === "held") {
    initialSlot = initialSlot ?? (slots[0] ? slotParam(slots[0]) : undefined);
    const holdMs = business.slotHoldMinutes * 60_000;
    held = { heldUntil: new Date(now.getTime() + holdMs).toISOString(), remainingMs: holdMs };
    initialAnswers = {
      visit: parseVisit(sampleBookingAnswers.visit, doctor.visitTypes),
      forWhom: sampleBookingAnswers.forWhom,
      ageGroup: sampleBookingAnswers.ageGroup,
      reason: loc === "ar" ? sampleBookingAnswers.reasonAr : sampleBookingAnswers.reasonEn,
    };
  }
  const earliest = slots.map(slotParam).find((iso) => iso !== takenSlot);
  const initialWeek = Math.max(0, weekOf(weeks, initialSlot ?? earliest));
  const weekend = business.weekend[viewer.country];
  const [first, second] = weekend ?? [];
  const weekendLegend =
    first && second && t.has(`countriesIn.${viewer.country}`)
      ? t("calendar.weekendLegend", { country: t(`countriesIn.${viewer.country}`), first: t(`weekdays.${first}`), second: t(`weekdays.${second}`) })
      : undefined;
  const price = d.feeUsdCents != null ? formatMoney(feeLines(d.feeUsdCents).totalCents, business.currencyPresentment, loc) : "";

  return (
    <BookingFrame crumbs={crumbs(t("crumb"))} title={t("title")} country={viewer.country} titleOnPhone={false}>
      <SlotPicker
        doctor={doctor}
        card={card}
        weeks={weeks}
        initialWeek={initialWeek}
        jumped={!initialSlot && initialWeek > 0}
        initialSlot={initialSlot}
        takenSlot={takenSlot}
        initialAnswers={initialAnswers}
        held={held}
        price={price}
        weekendLegend={weekendLegend}
        keep={keep}
        holdMinutes={business.slotHoldMinutes}
      />
    </BookingFrame>
  );
}
