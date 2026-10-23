// Screen 3, How it works (docs/screens/03-how-it-works.md). Three stacked steps (find, book, talk) in one main column (X2, X6);
// the fee example under step 2 as one all-in number plus the three lines that make it up, with the cancellation terms (C5, P5);
// video and phone with a best-for line under step 3 (C12); what to prepare as an accordion (X5, P10) and the emergency line
// (H14); a search CTA at the end that is sticky on phone.
// States: default; ?state=loading (skeleton); ?state=empty (no doctor has published a fee, so the worked example gives way to
// one action). Viewer country via ?country= (default SA) for the emergency number.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Badge, ChevronDown, ChevronNext, EmptyState, LinkButton, SectionHeading, Surface } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatNumber, type Locale, formatPercent } from "@/lib/format";
import { feeLines } from "@/lib/fees";
import { lowestVerifiedFeeCents } from "@/lib/sample";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { business } from "@/config/business";
import { AlertIcon, BookArt, FindArt, PhoneIcon, StepFrame, TalkArt, VideoIcon } from "./parts";
import Loading from "./loading";

const PREPARE = ["device", "room", "id", "notes", "records"] as const;
const VISIT_TYPES = [
  { type: "video", Icon: VideoIcon },
  { type: "phone", Icon: PhoneIcon },
] as const;

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "howItWorks" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function HowItWorks({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const viewer = viewerFrom(sp);
  const emergency = emergencyNumberFor(viewer.country);
  const t = await getTranslations("howItWorks");
  const tc = await getTranslations("common");

  const money = (minor: number) => formatMoney(minor, business.currencyPresentment, loc);
  const percent = (pct: number) => formatPercent(pct, loc);
  const num = (n: number) => formatNumber(n, loc);

  // Worked example from the lowest published first-visit fee, so it matches "from" prices elsewhere on the site.
  const exampleFee = sp.state === "empty" ? undefined : lowestVerifiedFeeCents();
  const fees = exampleFee != null ? feeLines(exampleFee) : undefined;
  const feeRows = fees
    ? [
        { key: "doctor", label: t("fees.doctorFee"), hint: t("fees.doctorFeeHint"), amount: fees.doctorFeeCents },
        {
          key: "platform",
          label: t("fees.platformFee"),
          hint: t("fees.platformFeeHint", { pct: percent(business.firstVisitPlatformFeePct) }),
          amount: fees.platformFeeCents,
        },
        {
          key: "card",
          label: t("fees.cardProcessing"),
          hint: t("fees.cardProcessingHint", { pct: percent(business.cardProcessingPct), fixed: money(business.cardProcessingFixedCents) }),
          amount: fees.cardProcessingCents,
        },
      ]
    : [];

  return (
    <>
      <SiteNav />
      <main>
        <header className="mx-auto max-w-3xl px-4 pb-6 pt-8 sm:px-6 sm:pb-10 sm:pt-14">
          <h1 className="text-3xl font-bold leading-tight text-sea-900 sm:text-5xl">{t("title")}</h1>
          <p className="mt-2 text-lg text-ink-700 sm:text-xl">{t("lead")}</p>
        </header>

        <ol aria-label={t("stepsLabel")} className="mx-auto flex max-w-3xl flex-col gap-6 px-4 sm:px-6">
          <StepFrame
            number={num(1)}
            title={t("step1.title")}
            body={<p>{t("step1.body")}</p>}
            art={<FindArt />}
            extra={
              <div className="mt-3 flex flex-col items-start gap-2">
                <Badge tone="info">{t("step1.noAccount")}</Badge>
                {/* Secondary route, kept quieter than the main path (rule X6). */}
                <Link href="/?chat=1" className="text-[15px] font-semibold text-sea-700 underline-offset-4 hover:underline">
                  {t("step1.notSure")} <ChevronNext className="inline size-4 align-middle" />
                </Link>
              </div>
            }
          />

          <StepFrame
            number={num(2)}
            title={t("step2.title")}
            body={
              <>
                <p>{t("step2.body")}</p>
                <p className="mt-1 text-sm text-ink-500">{t("step2.hold", { count: business.slotHoldMinutes, minutes: num(business.slotHoldMinutes) })}</p>
              </>
            }
            art={<BookArt />}
          >
            <section aria-labelledby="fees-title" className="rounded-[var(--radius-card)] bg-lagoon-100 p-4 sm:p-6">
              <h3 id="fees-title" className="text-lg font-bold text-sea-900 sm:text-xl">
                {t("fees.title")}
              </h3>
              <p className="mt-1 text-ink-700">{t("fees.lead")}</p>
              {fees ? (
                <>
                  <div className="mt-4 rounded-[var(--radius-field)] bg-white p-4 shadow-[var(--shadow-nav)] sm:p-5">
                    <p className="text-sm font-semibold text-ink-700">{t("fees.youPay")}</p>
                    <p className="tabular mt-0.5 text-4xl font-bold text-sea-900">{money(fees.totalCents)}</p>
                    <p className="mt-1 text-sm text-ink-500">{t("fees.example", { fee: money(fees.doctorFeeCents) })}</p>
                    <dl aria-label={t("fees.breakdown")} className="mt-4 border-t border-sand-200">
                      {feeRows.map((line) => (
                        <div key={line.key} className="flex items-start justify-between gap-4 border-b border-sand-200 py-3">
                          <dt className="min-w-0">
                            <span className="block font-semibold text-ink-900">{line.label}</span>
                            <span className="block text-sm text-ink-500">{line.hint}</span>
                          </dt>
                          <dd className="tabular shrink-0 font-semibold text-ink-900">{money(line.amount)}</dd>
                        </div>
                      ))}
                      <div className="flex items-baseline justify-between gap-4 pt-3 text-lg font-bold text-sea-900">
                        <dt>{t("fees.total")}</dt>
                        <dd className="tabular">{money(fees.totalCents)}</dd>
                      </div>
                    </dl>
                  </div>
                  <p className="mt-3 text-sm text-ink-700">{t("fees.payWith")}</p>
                </>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title={t("fees.emptyTitle")}
                    body={t("fees.emptyBody")}
                    action={<LinkButton href="/specialties">{t("fees.emptyAction")}</LinkButton>}
                  />
                </div>
              )}
              <div className="mt-4 border-t border-lagoon-600/25 pt-4">
                <h4 className="font-bold text-sea-900">{t("fees.cancelTitle")}</h4>
                <p className="mt-1 text-ink-700">
                  {t("fees.cancelBody", { count: business.fullRefundCutoffHours, hours: num(business.fullRefundCutoffHours) })}
                </p>
                <p className="mt-1 text-sm text-ink-700">{t("fees.cancelCheckout")}</p>
                <Link href="/refunds" className="mt-2 inline-flex items-center gap-1 font-semibold text-sea-700 underline-offset-4 hover:underline">
                  {t("fees.refundLink")} <ChevronNext />
                </Link>
              </div>
            </section>
          </StepFrame>

          <StepFrame number={num(3)} title={t("step3.title")} body={<p>{t("step3.body")}</p>} art={<TalkArt />}>
            <Surface className="sm:p-6">
              <section aria-labelledby="visit-title">
                <h3 id="visit-title" className="text-lg font-bold text-sea-900 sm:text-xl">
                  {t("visit.title")}
                </h3>
                <p className="mt-1 text-ink-700">{t("visit.lead")}</p>
                {/* Both types shown as equals, neither pre-selected (rule C12). */}
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {VISIT_TYPES.map(({ type, Icon }) => (
                    <li key={type} className="flex items-start gap-3 rounded-[var(--radius-field)] border border-sand-200 bg-sand-50 p-4">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
                        <Icon />
                      </span>
                      <div>
                        <p className="font-semibold text-ink-900">{t(`visit.${type}`)}</p>
                        <p className="text-sm text-ink-700">{t(`visit.${type}Best`)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-[var(--radius-field)] bg-sky-100 p-4">
                  <h3 className="font-bold text-sea-900">{t("scope.title")}</h3>
                  <p className="mt-1 text-sm text-ink-700">{t("scope.body")}</p>
                </div>
              </section>
            </Surface>
          </StepFrame>
        </ol>

        <section className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
          <SectionHeading title={t("prepare.title")} lead={t("prepare.lead")} />
          <Surface className="py-2">
            <ul className="divide-y divide-sand-200">
              {PREPARE.map((key) => (
                <li key={key}>
                  <details className="group py-1">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink-900">
                      {t(`prepare.${key}.q`)}
                      <ChevronDown className="size-4 shrink-0 text-sea-700 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="pb-3 text-ink-700">{t(`prepare.${key}.a`)}</p>
                  </details>
                </li>
              ))}
            </ul>
          </Surface>
          <div role="note" className="mt-4 flex items-start gap-3 rounded-[var(--radius-card)] border border-danger/40 bg-white p-4">
            <span className="text-danger">
              <AlertIcon />
            </span>
            <p className="font-semibold text-ink-900">{tc("notForEmergenciesWithNumber", { number: emergency })}</p>
          </div>
        </section>

        <section aria-labelledby="cta-title" className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pb-16">
          <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] bg-sea-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 id="cta-title" className="text-2xl font-bold">
                {t("cta.title")}
              </h2>
              <p className="mt-1 text-white/85">{t("cta.body")}</p>
            </div>
            {/* Wrapped so `hidden` is not fought by the button's own display utility; on phone the sticky bar below is the CTA. */}
            <div className="hidden shrink-0 sm:block">
              <LinkButton href="/search" size="lg" variant="secondary" className="whitespace-nowrap">
                {tc("findDoctor")} <ChevronNext />
              </LinkButton>
            </div>
          </div>
        </section>

        {/* Phone: sticky to the bottom of the viewport while reading, and it settles under the closing band at the end. */}
        <div className="sticky bottom-0 z-10 mt-6 border-t border-sand-300 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
          <LinkButton href="/search" className="w-full">
            {tc("findDoctor")} <ChevronNext />
          </LinkButton>
        </div>
      </main>
      <SiteFooter emergencyNumber={emergency} />
    </>
  );
}
