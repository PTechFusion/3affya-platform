// Screen 1, Home (docs/screens/01-home.md). States: default, ?q= (search typed), ?chat=1 (intake chat open),
// ?state=loading (doctor strip skeleton), ?state=empty (no verified doctors). Viewer country via ?country= (default SA).
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { WaterHero } from "@/components/brand/WaterHero";
import { TrustStrip } from "@/components/brand/TrustStrip";
import { SearchBox, type SearchSuggestion } from "@/components/brand/SearchBox";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { DoctorCardSkeleton } from "@/components/brand/DoctorCardSkeleton";
import { IntakeChatSheet } from "@/components/brand/IntakeChatSheet";
import { Chip, ChevronNext, CtaBand, Disclosure, EmptyState, LinkButton, SectionHeading, Surface } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatMoney, type Locale } from "@/lib/format";
import { featuredDoctors, lowestVerifiedFeeCents, sampleSpecialties, toDoctorCardData, verifiedDoctors } from "@/lib/sample";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { feeLines } from "@/lib/fees";
import { business } from "@/config/business";

// Curated chips (rule X7): the four specialties patients ask for most, not the four largest counts.
const HOME_CHIPS = ["family-medicine", "pediatrics", "dermatology", "cardiology"];

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function Home({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  const state = sp.state;
  const query = typeof sp.q === "string" ? sp.q : "";
  const chatOpen = sp.chat === "1";
  const viewer = viewerFrom(sp);
  const emergency = emergencyNumberFor(viewer.country);

  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const tl = await getTranslations("languages");

  const name = (d: { nameEn: string; nameAr: string }) => (loc === "ar" ? d.nameAr : d.nameEn);
  const specialtyName = (s: { nameEn: string; nameAr: string }) => (loc === "ar" ? s.nameAr : s.nameEn);
  const suggestions: SearchSuggestion[] = [
    ...sampleSpecialties.map((s) => ({ kind: "specialty" as const, label: specialtyName(s), href: `/search?specialty=${s.slug}` })),
    ...verifiedDoctors().map((d) => ({ kind: "doctor" as const, label: name(d), href: `/doctors/${d.id}` })),
  ];
  const chips = HOME_CHIPS.map((slug) => sampleSpecialties.find((s) => s.slug === slug)).filter((s) => s !== undefined);
  const doctors = state === "empty" ? [] : featuredDoctors();
  const lowestFee = lowestVerifiedFeeCents();
  // Rule C5: the "from" price is the all-in total the patient pays, never the doctor fee with fees added later.
  const fromPrice = lowestFee != null ? formatMoney(feeLines(lowestFee).totalCents, business.currencyPresentment, loc) : undefined;
  const steps = ["1", "2", "3"] as const;
  const faqs = ["1", "2", "3"] as const;

  return (
    <>
      <SiteNav />
      <WaterHero className="min-h-[520px]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-36 pt-14 sm:px-6 sm:pb-44 sm:pt-20">
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-gold-300 sm:text-6xl">{t("title")}</h1>
          <p className="max-w-xl text-lg text-white/90 sm:text-xl">{t("subtitle")}</p>
          <div className="max-w-xl">
            <SearchBox suggestions={suggestions} initialQuery={query} />
          </div>
          <ul className="flex flex-wrap gap-2" aria-label={t("popularSpecialties")}>
            {chips.map((s) => (
              <li key={s.slug}>
                <Link href={`/search?specialty=${s.slug}`} className="rounded-[var(--radius-tag)]">
                  <Chip tone="water">{specialtyName(s)}</Chip>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/?chat=1" className="inline-flex items-center gap-1 self-start font-semibold text-white underline-offset-4 hover:underline">
            {t("askChat")} <ChevronNext />
          </Link>
        </div>
      </WaterHero>

      <TrustStrip fromPriceLabel={fromPrice} />

      <main>
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="doctors-title">
          <SectionHeading
            title={t("doctorsTitle")}
            lead={t("doctorsLead")}
            action={
              <Link href="/search" className="inline-flex items-center gap-1 font-semibold text-sea-700 hover:underline">
                {t("seeAllDoctors")} <ChevronNext />
              </Link>
            }
          />
          {state === "loading" ? (
            <div className="grid gap-6 md:grid-cols-2">
              <DoctorCardSkeleton />
              <DoctorCardSkeleton />
            </div>
          ) : doctors.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {doctors.map((d) => (
                <DoctorCard key={d.id} doctor={toDoctorCardData(d, loc, viewer.timeZone, tl)} state="verified" />
              ))}
            </div>
          ) : (
            <div className="max-w-md">
              <EmptyState
                title={t("doctorsEmptyTitle")}
                body={t("doctorsEmptyBody")}
                action={<LinkButton href="/specialties">{t("doctorsEmptyAction")}</LinkButton>}
              />
            </div>
          )}
        </section>

        <section className="bg-white" aria-labelledby="steps-title">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <SectionHeading title={t("stepsTitle")} lead={t("stepsLead")} />
            <ol className="grid gap-4 md:grid-cols-3">
              {steps.map((n) => (
                <li key={n}>
                  <Surface className="h-full border-sand-200 bg-sand-50">
                    <span className="tabular inline-flex size-10 items-center justify-center rounded-full bg-lagoon-600 text-lg font-bold text-white">{n}</span>
                    <h3 className="mt-3 text-lg font-bold text-sea-900">{t(`step${n}Title`)}</h3>
                    <p className="mt-1 text-ink-700">{t(`step${n}Body`)}</p>
                  </Surface>
                </li>
              ))}
            </ol>
            <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-start">
              <div className="rounded-[var(--radius-card)] bg-sky-100 p-5 sm:p-6">
                <h3 className="text-lg font-bold text-sea-900">{t("legalTitle")}</h3>
                <p className="mt-2 text-ink-700">{t("legalBody")}</p>
                <Link href="/how-it-works" className="mt-3 inline-flex items-center gap-1 font-semibold text-sea-700 hover:underline">
                  {t("legalLink")} <ChevronNext />
                </Link>
              </div>
              <div className="rounded-[var(--radius-card)] border border-sand-200 p-5 sm:p-6">
                <SectionHeading
                  title={t("faqTitle")}
                  action={
                    <Link href="/faq" className="inline-flex items-center gap-1 text-sm font-semibold text-sea-700 hover:underline">
                      {t("faqLink")} <ChevronNext />
                    </Link>
                  }
                />
                <ul className="divide-y divide-sand-200">
                  {faqs.map((n) => (
                    <li key={n}>
                      <Disclosure summary={t(`faq${n}Q`)}>{t(`faq${n}A`)}</Disclosure>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <CtaBand
            title={tc("tagline")}
            body={t("ctaBody")}
            action={
              <LinkButton href="/search" size="lg" variant="secondary">
                {tc("findDoctor")} <ChevronNext />
              </LinkButton>
            }
          />
        </section>
      </main>

      <SiteFooter emergencyNumber={emergency} />
      {chatOpen ? <IntakeChatSheet emergencyNumber={emergency} closeHref="/" /> : null}
    </>
  );
}
