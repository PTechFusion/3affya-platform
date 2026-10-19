// Screen 12, For professionals (docs/screens/12-for-professionals.md). States: default; ?q= (name or NPI typed, the doctor's
// own profile suggested); ?state=empty or a ?q= with no match (profile not found, one action); ?state=loading (skeleton).
// Viewer country via ?country= (emergency line), time zone via ?tz= (dates on the example card).
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { WaterHero } from "@/components/brand/WaterHero";
import { SearchBox, type SearchSuggestion } from "@/components/brand/SearchBox";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { Badge, Button, CheckIcon, ChevronDown, ChevronNext, EmptyState, LinkButton, SectionHeading, Surface } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatNumber, type Locale } from "@/lib/format";
import { sampleDoctors, toDoctorCardData } from "@/lib/sample";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { business } from "@/config/business";
import { PLANS, PLAN_FEATURES, planIncludes, type PlanId } from "./plans";
import Loading from "./loading";

const EXAMPLE_DOCTOR_ID = "doc_003"; // a live card: fee and next time on the back
const NPI_DIGITS = 10;
// Patient-side outcomes the page sells on (rule B9). Published research figures, not business settings, so they sit here with
// their sources, which the page names: Doximity's 500,000-profile analysis (photo views), Zocdoc patient access data (72 hours).
const PHOTO_VIEWS_MULTIPLE = 2;
const BOOK_WITHIN_HOURS = 72;
const DOXIMITY_PROFILES = 500_000;

const STEPS = ["claim", "verify", "live"] as const;
const NEEDS = ["npi", "licence", "board", "specialty", "photo"] as const;
const FAQS = ["free", "why", "need", "fee", "lapse", "remove", "reviews"] as const;
const FIND_HREF = "/for-professionals#find-profile";
const NEW_PROFILE_HREF = "/professional/builder";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forProfessionals" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function ForProfessionals({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const loc = locale as Locale;
  const query = typeof sp.q === "string" ? sp.q : "";
  const viewer = viewerFrom(sp);
  const emergency = emergencyNumberFor(viewer.country);

  const t = await getTranslations("forProfessionals");
  const tCard = await getTranslations("card");
  const tl = await getTranslations("languages");
  const num = (v: number) => formatNumber(v, loc);
  const money = (cents: number) => formatMoney(cents, business.membershipCurrency, loc);
  const pct = formatNumber(business.firstVisitPlatformFeePct / 100, loc, { style: "percent" });

  // Find your profile: every listing, matched on both scripts and the NPI; the row says the specialty and the claim state.
  const suggestions: SearchSuggestion[] = sampleDoctors.map((d) => ({
    kind: "doctor",
    label: loc === "ar" ? d.nameAr : d.nameEn,
    href: `/doctors/${d.id}`,
    keywords: `${d.nameEn} ${d.nameAr} ${d.npi}`,
    meta: `${loc === "ar" ? d.specialtyAr : d.specialtyEn} · ${tCard(d.state)}`,
  }));
  const q = query.trim().toLocaleLowerCase();
  const hasMatch = suggestions.some((s) => `${s.label} ${s.keywords}`.toLocaleLowerCase().includes(q));
  const notFound = sp.state === "empty" || (q.length > 0 && !hasMatch);

  const example = sampleDoctors.find((d) => d.id === EXAMPLE_DOCTOR_ID) ?? sampleDoctors[0];

  const monthly = business.membershipMonthlyCents;
  const yearly = business.membershipYearlyCents;
  const banner = business.bannerMonthlyCents;
  const yearlySaving = monthly * 12 - yearly;
  const planName = (id: PlanId) => t(`plans.${id}.name`);
  const plans: Record<PlanId, { price: string; period: string; extra?: string; badge?: ReactNode; cta: ReactNode }> = {
    claimed: {
      price: t("plans.claimed.price"),
      period: t("plans.claimed.period"),
      cta: (
        <LinkButton href={FIND_HREF} variant="secondary" className="w-full">
          {t("cta.action")}
        </LinkButton>
      ),
    },
    member: {
      price: money(monthly),
      period: t("plans.perMonth"),
      extra:
        yearlySaving > 0
          ? t("plans.member.yearly", { price: money(yearly), saving: money(yearlySaving) })
          : t("plans.member.yearlyPlain", { price: money(yearly) }),
      badge: <Badge tone="info">{t("plans.recommended")}</Badge>,
      cta: (
        <LinkButton href="/professional/membership" className="w-full">
          {t("plans.choose", { plan: planName("member") })}
        </LinkButton>
      ),
    },
    featured: {
      price: money(monthly + banner),
      period: t("plans.perMonth"),
      extra: t("plans.featured.breakdown", { member: money(monthly), banner: money(banner) }),
      badge: <Badge tone="pending">{t("plans.fromJanuary")}</Badge>,
      // Banner sales start with the home carousel in January (change log 16 Oct), so nothing to buy yet.
      cta: (
        <Button variant="secondary" disabled className="w-full">
          {t("plans.opensJanuary")}
        </Button>
      ),
    },
  };

  const stats = [
    { title: t("stats.photoTitle", { n: num(PHOTO_VIEWS_MULTIPLE) }), body: t("stats.photoBody") },
    { title: t("stats.speedTitle", { hours: num(BOOK_WITHIN_HOURS) }), body: t("stats.speedBody", { hours: num(BOOK_WITHIN_HOURS) }) },
    { title: t("stats.languageTitle"), body: t("stats.languageBody") },
  ];
  const hours = { hours: business.removalSlaHours, hoursLabel: num(business.removalSlaHours) };
  const faqAnswer = (key: (typeof FAQS)[number]) =>
    key === "fee"
      ? t("faq.fee.a", { pct })
      : key === "lapse"
        ? t("faq.lapse.a", { days: business.membershipGraceDays, daysLabel: num(business.membershipGraceDays) })
        : key === "remove"
          ? t("faq.remove.a", hours)
          : t(`faq.${key}.a`);
  const stepBody = (key: (typeof STEPS)[number]) =>
    key === "claim"
      ? t("steps.claim.body", { digits: num(business.otpDigits) })
      : key === "verify"
        ? t("steps.verify.body", { months: business.verifiedReverifyMonths, monthsLabel: num(business.verifiedReverifyMonths) })
        : t("steps.live.body");

  return (
    <>
      <SiteNav />
      {/* Phone: the card sits on the shoreline under the hero. Desktop: it moves into the hero's end column. */}
      <div className="relative">
        <WaterHero className="md:min-h-[600px]">
          <div className="mx-auto max-w-6xl px-4 pb-40 pt-8 sm:px-6 sm:pt-14 md:pb-32">
            <div className="flex flex-col gap-4 md:max-w-[52%] md:gap-5">
              <p className="self-start rounded-[var(--radius-tag)] bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-white/40">
                {t("eyebrow")}
              </p>
              <h1 className="text-3xl font-bold leading-tight text-gold-300 sm:text-5xl">{t("title")}</h1>
              <p className="text-white/90 sm:text-lg">{t("subtitle")}</p>
              <div id="find-profile" className="scroll-mt-28">
                <h2 className="mb-2 text-lg font-bold text-white">{t("findTitle")}</h2>
                <SearchBox
                  suggestions={suggestions}
                  initialQuery={query}
                  initialOpen={q.length > 0 && !notFound}
                  labels={{
                    label: t("searchLabel"),
                    placeholder: t("searchPlaceholder", { digits: num(NPI_DIGITS) }),
                    submit: t("searchSubmit"),
                    noSuggestions: t("noSuggestions"),
                  }}
                />
                <p className="mt-2 text-sm text-white/90">
                  {t("searchHint")}
                  {notFound ? null : (
                    <>
                      {" "}
                      {t("notListedLead")}{" "}
                      <Link href={NEW_PROFILE_HREF} className="font-semibold text-white underline underline-offset-4">
                        {t("notListedLink")}
                      </Link>
                    </>
                  )}
                </p>
              </div>
              {notFound ? (
                <EmptyState
                  title={t("empty.title")}
                  body={t("empty.body")}
                  action={<LinkButton href={NEW_PROFILE_HREF}>{t("empty.action")}</LinkButton>}
                />
              ) : null}
            </div>
          </div>
        </WaterHero>
        <div className="relative mx-auto -mt-28 max-w-6xl px-4 sm:px-6 md:absolute md:inset-x-0 md:top-14 md:mt-0">
          <figure className="flex flex-col items-start gap-3 md:ms-auto md:w-[44%]">
            <Badge tone="info">{t("exampleCard")}</Badge>
            {example ? <DoctorCard doctor={toDoctorCardData(example, loc, viewer.timeZone, tl)} state="verified" /> : null}
            <figcaption className="max-w-md text-sm text-ink-700 md:text-white/90">{t("cardCaption")}</figcaption>
          </figure>
        </div>
      </div>

      <main>
        <section aria-label={t("statsLabel")} className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 md:pt-10">
          <ul className="grid gap-4 rounded-[var(--radius-card)] border border-sand-200 bg-white p-5 sm:grid-cols-3 sm:gap-6 sm:p-6">
            {stats.map((s) => (
              <li key={s.title}>
                <p className="text-xl font-bold text-sea-900">{s.title}</p>
                <p className="mt-1 text-sm text-ink-700">{s.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-500">{t("stats.source", { profiles: num(DOXIMITY_PROFILES) })}</p>
        </section>

        <section className="mt-12 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <SectionHeading title={t("stepsTitle")} lead={t("stepsLead")} />
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map((key, i) => (
                <li key={key}>
                  <Surface className="h-full">
                    <div className="flex items-center justify-between gap-3">
                      <span className="tabular inline-flex size-10 items-center justify-center rounded-full bg-lagoon-600 text-lg font-bold text-white">
                        {num(i + 1)}
                      </span>
                      {key !== "live" ? <Badge tone="success">{t("free")}</Badge> : null}
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-sea-900">{t(`steps.${key}.title`)}</h3>
                    <p className="mt-1 text-ink-700">{stepBody(key)}</p>
                  </Surface>
                </li>
              ))}
            </ol>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[var(--radius-card)] bg-sky-100 p-5 sm:p-6">
                <h3 className="text-lg font-bold text-sea-900">{t("need.title")}</h3>
                <ul className="mt-3 space-y-2">
                  {NEEDS.map((key) => (
                    <li key={key} className="flex items-start gap-2.5 text-ink-900">
                      <IncludedMark />
                      <span>{t(`need.${key}`)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-ink-700">{t("need.later")}</p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-sand-200 p-5 sm:p-6">
                <h3 className="text-lg font-bold text-sea-900">{t("before.title")}</h3>
                <p className="mt-2 text-ink-700">{t("before.scrutiny")}</p>
                <p className="mt-3 text-ink-700">{t("before.remove", hours)}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="plans" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-12 sm:px-6">
          <SectionHeading title={t("plans.title")} lead={t("plans.lead")} />
          {business.membershipPricesConfirmed ? null : (
            <p className="mb-5 rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-500">
              {t("plans.placeholderNote")}
            </p>
          )}

          {/* Phone: plans stacked, the middle one highlighted. */}
          <ol className="grid gap-5 md:hidden">
            {PLANS.map((id, i) => {
              const plan = plans[id];
              const previous = PLANS[i - 1];
              return (
                <li
                  key={id}
                  className={id === "member" ? "rounded-[var(--radius-card)] shadow-[var(--shadow-card)] ring-2 ring-sea-700" : undefined}
                >
                  <Surface className="h-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xl font-bold text-sea-900">{planName(id)}</h3>
                      {plan.badge}
                    </div>
                    <p className="text-sm text-ink-700">{t(`plans.${id}.tagline`)}</p>
                    <p className="tabular mt-4 text-3xl font-bold text-ink-900">{plan.price}</p>
                    <p className="text-sm text-ink-700">{plan.period}</p>
                    {plan.extra ? <p className="mt-1 text-sm text-ink-700">{plan.extra}</p> : null}
                    {previous ? <p className="mt-4 text-sm font-semibold text-ink-900">{t("plans.everythingIn", { plan: planName(previous) })}</p> : null}
                    <ul className={["space-y-2", previous ? "mt-2" : "mt-4"].join(" ")}>
                      {PLAN_FEATURES.filter((f) => f.from === id).map((f) => (
                        <li key={f.key} className="flex items-start gap-2.5 text-ink-900">
                          <IncludedMark />
                          <span>{t(`features.${f.key}`)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5">{plan.cta}</div>
                  </Surface>
                </li>
              );
            })}
          </ol>

          {/* Desktop: one static comparison table, plans as columns, the middle column highlighted. */}
          <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white md:block">
            <table className="w-full table-fixed border-collapse">
              <caption className="sr-only">{t("plans.caption")}</caption>
              <colgroup>
                <col className="w-[31%]" />
                <col />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <td className="px-5 pb-3 pt-6 align-bottom text-sm font-semibold text-ink-500">{t("plans.featureColumn")}</td>
                  {PLANS.map((id) => (
                    <th
                      key={id}
                      scope="col"
                      className={["px-5 pb-3 pt-6 text-start align-top font-normal", id === "member" ? "bg-sea-900 text-white" : "text-ink-900"].join(" ")}
                    >
                      <span className="flex min-h-7 flex-wrap items-center gap-2">
                        <span className={["text-xl font-bold", id === "member" ? "text-white" : "text-sea-900"].join(" ")}>{planName(id)}</span>
                        {plans[id].badge}
                      </span>
                      <span className={["mt-1 block text-sm", id === "member" ? "text-white/85" : "text-ink-700"].join(" ")}>
                        {t(`plans.${id}.tagline`)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row" className="px-5 pb-6 pt-3 text-start align-top font-medium text-ink-900">
                    {t("plans.priceRow")}
                  </th>
                  {PLANS.map((id) => {
                    const plan = plans[id];
                    const dark = id === "member";
                    return (
                      <td key={id} className={["px-5 pb-6 pt-3 align-top", dark ? "bg-sea-900 text-white" : "text-ink-900"].join(" ")}>
                        <p className="tabular text-3xl font-bold">{plan.price}</p>
                        <p className={["text-sm", dark ? "text-white/85" : "text-ink-700"].join(" ")}>{plan.period}</p>
                        <p className={["mt-1 min-h-10 text-sm", dark ? "text-white/85" : "text-ink-700"].join(" ")}>{plan.extra}</p>
                        <div className="mt-4">
                          {dark ? (
                            <LinkButton href="/professional/membership" variant="secondary" className="w-full">
                              {t("plans.choose", { plan: planName("member") })}
                            </LinkButton>
                          ) : (
                            plan.cta
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                {PLAN_FEATURES.map((f) => (
                  <tr key={f.key} className="border-t border-sand-200">
                    <th scope="row" className="px-5 py-3.5 text-start font-medium text-ink-900">
                      {t(`features.${f.key}`)}
                    </th>
                    {PLANS.map((id) => (
                      <td key={id} className={["px-5 py-3.5 text-center", id === "member" ? "bg-sea-100" : ""].join(" ")}>
                        {planIncludes(id, f) ? (
                          <IncludedMark label={t("plans.included")} />
                        ) : (
                          <span className="text-ink-500">
                            <span aria-hidden="true">–</span>
                            <span className="sr-only">{t("plans.notIncluded")}</span>
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-1 text-sm text-ink-700">
            <p>{t("plans.feeNote", { pct })}</p>
            <p>{t("plans.priceNote")}</p>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="max-w-3xl">
              <SectionHeading
                title={t("faqTitle")}
                action={
                  <Link href="/faq" className="inline-flex items-center gap-1 text-sm font-semibold text-sea-700 hover:underline">
                    {t("faqLink")} <ChevronNext />
                  </Link>
                }
              />
              <ul className="divide-y divide-sand-200 rounded-[var(--radius-card)] border border-sand-200 px-5">
                {FAQS.map((key) => (
                  <li key={key}>
                    <details className="group py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink-900">
                        {t(`faq.${key}.q`)}
                        <ChevronDown className="size-4 shrink-0 text-sea-700 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 text-ink-700">{faqAnswer(key)}</p>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] bg-sea-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-2xl font-bold">{t("cta.title")}</h2>
              <p className="mt-1 text-white/85">{t("cta.body")}</p>
            </div>
            <LinkButton href={FIND_HREF} size="lg" variant="secondary">
              {t("cta.action")} <ChevronNext />
            </LinkButton>
          </div>
        </section>
      </main>

      <SiteFooter emergencyNumber={emergency} />
    </>
  );
}

/** Lagoon check in a circle; the check never mirrors (rule R2). With a label it also reads as Included to screen readers. */
function IncludedMark({ label }: { label?: string }) {
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
      <CheckIcon className="size-3.5" />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
