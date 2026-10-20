// The booking pages' frame and their dead ends, each an empty state with exactly one action (rule L3): the doctor cannot take
// a booking (not verified, or payouts not ready), the doctor has no open time yet, or checkout has no usable time.
import { getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { Breadcrumbs, EmptyState, LinkButton } from "@/components/ui";
import type { Locale } from "@/lib/format";
import { toDoctorCardData, toRegistryCardData, withoutBooking, type SampleDoctor } from "@/lib/sample";
import { emergencyNumberFor, type Viewer } from "@/lib/viewer";

export async function BookingFrame({
  crumbs,
  title,
  lead,
  country,
  titleOnPhone = true,
  children,
}: {
  crumbs: Array<{ label: string; href?: string }>;
  title: string;
  lead?: string;
  country: string;
  /** False keeps the heading for screen readers only on phone, so the card, visit type and times fit the first screen. */
  titleOnPhone?: boolean;
  children: React.ReactNode;
}) {
  const t = await getTranslations("book");
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs label={t("breadcrumb")} items={crumbs} />
        <h1 className={titleOnPhone ? "mt-2 text-2xl font-bold text-sea-900 sm:text-3xl" : "sr-only sm:not-sr-only sm:mt-2 sm:block sm:text-3xl sm:font-bold sm:text-sea-900"}>
          {title}
        </h1>
        {lead ? <p className="mt-1 text-ink-700">{lead}</p> : null}
        <div className="mt-3 sm:mt-5">{children}</div>
      </main>
      <SiteFooter emergencyNumber={emergencyNumberFor(country)} />
    </>
  );
}

/** Online booking is not open: an unclaimed or pending profile (rules U1, U2: no booking path at all), or payouts not ready. */
export async function NotBookable({ doctor: d, locale, viewer }: { doctor: SampleDoctor; locale: Locale; viewer: Viewer }) {
  const t = await getTranslations("book");
  const tn = await getTranslations("nav");
  const tl = await getTranslations("languages");
  const ar = locale === "ar";
  const name = ar ? d.nameAr : d.nameEn;
  const specialty = ar ? d.specialtyAr : d.specialtyEn;
  const verified = d.state === "verified";
  const card = verified ? withoutBooking(toDoctorCardData(d, locale, viewer.timeZone, tl)) : toRegistryCardData(d, locale, viewer.timeZone, tl);
  return (
    <BookingFrame
      crumbs={[{ label: tn("doctors"), href: "/search" }, { label: name, href: `/doctors/${d.id}` }, { label: t("crumb") }]}
      title={t("title")}
      country={viewer.country}
    >
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <DoctorCard doctor={card} state={d.state} size="mini" side="front" />
        <EmptyState
          title={t("notBookable.title", { name })}
          body={verified ? t("notBookable.bodyPayouts", { name, gender: d.gender }) : t("notBookable.bodyRegistry", { name, gender: d.gender })}
          action={<LinkButton href={`/search?specialty=${d.specialty}`}>{t("notBookable.action", { specialty })}</LinkButton>}
        />
      </div>
    </BookingFrame>
  );
}

/** A dead end inside the flow: the mini card, then one empty state with one action. */
export async function BookingDeadEnd({
  doctor: d,
  locale,
  viewer,
  crumbs,
  title,
  body,
  action,
}: {
  doctor: SampleDoctor;
  locale: Locale;
  viewer: Viewer;
  crumbs: Array<{ label: string; href?: string }>;
  title: string;
  body: string;
  action: { href: string; label: string };
}) {
  const tl = await getTranslations("languages");
  const card = toDoctorCardData(d, locale, viewer.timeZone, tl);
  return (
    <BookingFrame crumbs={crumbs} title={crumbs[crumbs.length - 1]?.label ?? title} country={viewer.country}>
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <DoctorCard doctor={card} state="verified" size="mini" side="front" />
        <EmptyState title={title} body={body} action={<LinkButton href={action.href}>{action.label}</LinkButton>} />
      </div>
    </BookingFrame>
  );
}
