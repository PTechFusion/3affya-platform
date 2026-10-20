// Screen 2, Why US training (docs/screens/02-why-us-training.md). States: default; ?state=loading (skeleton).
// Viewer country via ?country= (default SA) sets the emergency number in the legal list and the footer.
// Rules: X1 X2 (grade-6 copy, one main column), H3 (front-loaded headings), H8 (board certified defined where the badge first
// appears), X3 (every credential claim links to its public verifier), H13 H15 (medical-travel bridge, legal paragraph), X4 (date).
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { TrustStrip } from "@/components/brand/TrustStrip";
import { Badge, CheckIcon, ChevronNext, LinkButton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatNumber, type Locale } from "@/lib/format";
import { lowestVerifiedFeeCents } from "@/lib/sample";
import { feeLines } from "@/lib/fees";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { business } from "@/config/business";
import { WhyUsSkeleton } from "./WhyUsSkeleton";

/** Day this page's copy was last reviewed (rule X4). Update it whenever the copy changes. A calendar date, shown in UTC. */
const REVIEWED_ON = "2026-10-19";

/** Public lookups a patient can use to check a credential claim themselves (rule X3). */
const VERIFIERS = {
  board: { href: "https://www.certificationmatters.org/", domain: "certificationmatters.org" },
  licence: { href: "https://www.docinfo.org/", domain: "docinfo.org" },
} as const;

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "whyUs" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function WhyUsTraining({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  if (sp.state === "loading") return <WhyUsSkeleton />;

  const viewer = viewerFrom(sp);
  const emergency = emergencyNumberFor(viewer.country);
  const t = await getTranslations("whyUs");
  const tcard = await getTranslations("card");

  const lowestFee = lowestVerifiedFeeCents();
  const fromPrice = lowestFee != null ? formatMoney(feeLines(lowestFee).totalCents, business.currencyPresentment, loc) : undefined; // all-in, rule C5
  const months = business.verifiedReverifyMonths;
  const reviewed = formatDate(new Date(`${REVIEWED_ON}T00:00:00Z`), "UTC", loc);
  const steps = ["1", "2", "3", "4"] as const;

  const checks: Array<{ title: string; body: string }> = [
    { title: t("verify.licenceTitle"), body: t("verify.licenceBody") },
    { title: t("verify.boardTitle"), body: t("verify.boardBody") },
    { title: t("verify.identityTitle"), body: t("verify.identityBody") },
    { title: t("verify.dateTitle"), body: t("verify.dateBody", { months: formatNumber(months, loc), count: months }) },
  ];
  const costs: Array<{ title: string; body: string }> = [
    { title: t("cost.travelTitle"), body: t("cost.travelBody") },
    { title: t("cost.priceTitle"), body: fromPrice ? t("cost.priceBody", { price: fromPrice }) : t("cost.priceBodyUnknown") },
    { title: t("cost.totalTitle"), body: t("cost.totalBody") },
  ];

  return (
    <>
      <SiteNav />
      <main>
        <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Above the fold: the title, the one-paragraph answer and the hook (rules X1, H1). */}
          <header className="max-w-2xl lg:col-start-1 lg:row-start-1">
            <h1 className="text-3xl font-bold leading-tight text-sea-900 sm:text-5xl">{t("title")}</h1>
            <p className="mt-4 text-lg text-ink-700 sm:text-xl">{t("answer")}</p>
            <div className="mt-6 flex flex-col items-start gap-2">
              <LinkButton href="/search" size="lg">
                {t("checkDoctor")} <ChevronNext />
              </LinkButton>
              <p className="text-sm text-ink-500">{t("checkDoctorHint")}</p>
            </div>
          </header>

          {/* The three-credential strip: beside the article on desktop, after the answer on phone. */}
          <aside className="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <TrustStrip layout="stack" fromPriceLabel={fromPrice} />
          </aside>

          <div className="max-w-2xl space-y-12 lg:col-start-1 lg:row-start-2">
            <section aria-labelledby="training-title">
              <SectionTitle id="training-title" title={t("training.title")} lead={t("training.lead")} />
              <ClaimCard
                ordered
                items={steps.map((n, i) => ({
                  title: t(`training.step${n}Title`),
                  body: t(`training.step${n}Body`),
                  marker: (
                    <span className="tabular inline-flex size-8 items-center justify-center rounded-full bg-lagoon-600 font-bold text-white">
                      {formatNumber(i + 1, loc)}
                    </span>
                  ),
                  // H8: the badge patients see on cards, defined right here in one sentence.
                  extra: n === "4" ? <Badge tone="verified">{tcard("boardCertified")}</Badge> : undefined,
                }))}
                verifier={
                  <VerifierLink
                    href={VERIFIERS.board.href}
                    domain={VERIFIERS.board.domain}
                    label={t("training.verifyLabel")}
                    source={t("training.verifySource")}
                    newSite={t("opensNewSite")}
                  />
                }
              />
            </section>

            <section aria-labelledby="verify-title">
              <SectionTitle id="verify-title" title={t("verify.title")} lead={t("verify.lead")} />
              <ClaimCard
                items={checks}
                verifier={
                  <VerifierLink
                    href={VERIFIERS.licence.href}
                    domain={VERIFIERS.licence.domain}
                    label={t("verify.verifyLabel")}
                    source={t("verify.verifySource")}
                    newSite={t("opensNewSite")}
                  />
                }
              />
            </section>

            <section aria-labelledby="cost-title">
              <SectionTitle id="cost-title" title={t("cost.title")} lead={t("cost.lead")} />
              <ClaimCard items={costs} verifier={<VerifierLink href="/fees" label={t("cost.feesLabel")} source={t("cost.feesSource")} />} />
            </section>

            {/* Medical-travel bridge into the legal paragraph (rules H13, H15). */}
            <section aria-labelledby="bridge-title" className="rounded-[var(--radius-card)] bg-sky-100 p-5 sm:p-6">
              <h2 id="bridge-title" className="text-xl font-bold text-sea-900 sm:text-2xl">
                {t("bridge.title")}
              </h2>
              <p className="mt-2 text-ink-700">{t("bridge.body")}</p>
              <p className="mt-1 text-sm text-ink-500">{t("bridge.source")}</p>
              <h3 className="mt-6 text-lg font-bold text-sea-900">{t("legal.title")}</h3>
              <p className="mt-2 text-ink-700">{t("legal.body")}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-ink-900">{t("legal.canTitle")}</p>
                  <ul className="mt-2 space-y-2">
                    {(["can1", "can2", "can3"] as const).map((k) => (
                      <li key={k} className="flex items-start gap-2 text-ink-700">
                        <CheckIcon className="mt-1 size-4 shrink-0 text-success" />
                        {t(`legal.${k}`)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-ink-900">{t("legal.cannotTitle")}</p>
                  <ul className="mt-2 space-y-2">
                    {(["cannot1", "cannot2", "cannot3"] as const).map((k) => (
                      <li key={k} className="flex items-start gap-2 text-ink-700">
                        <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-500" />
                        {t(`legal.${k}`, { number: emergency })}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Link href="/how-it-works" className="mt-5 inline-flex items-center gap-1 font-semibold text-sea-700 hover:underline">
                {t("legal.link")} <ChevronNext />
              </Link>
            </section>

            <section
              aria-labelledby="closing-title"
              className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] bg-sea-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 id="closing-title" className="text-xl font-bold sm:text-2xl">
                  {t("closing.title")}
                </h2>
                <p className="mt-1 text-white/85">{t("closing.body")}</p>
              </div>
              <LinkButton href="/search" variant="secondary" className="shrink-0">
                {t("checkDoctor")} <ChevronNext />
              </LinkButton>
            </section>
          </div>

          <p className="max-w-2xl border-t border-sand-200 pt-4 text-sm text-ink-500 lg:col-start-1 lg:row-start-3">
            <time dateTime={REVIEWED_ON}>{t("lastReviewed", { date: reviewed })}</time>
          </p>
        </div>
      </main>
      <SiteFooter emergencyNumber={emergency} />
    </>
  );
}

function SectionTitle({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <>
      <h2 id={id} className="text-2xl font-bold text-sea-900 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-ink-700">{lead}</p>
    </>
  );
}

type ClaimItem = { title: string; body: string; marker?: ReactNode; extra?: ReactNode };

/**
 * One card per section: front-loaded rows (rule H3, a bold first word or two, then one plain sentence) and, as the card's
 * footer, the link to where the patient can check the claim (rule X3).
 */
function ClaimCard({ items, verifier, ordered }: { items: ClaimItem[]; verifier: ReactNode; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  return (
    <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white">
      <List className="divide-y divide-sand-200">
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-3 px-4 py-4 sm:px-5">
            <span aria-hidden="true" className="mt-0.5 shrink-0">
              {item.marker ?? (
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
                  <CheckIcon className="size-4" />
                </span>
              )}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-sea-900">{item.title}</h3>
              {item.extra ? <div className="mt-1">{item.extra}</div> : null}
              <p className="mt-0.5 text-ink-700">{item.body}</p>
            </div>
          </li>
        ))}
      </List>
      {verifier}
    </div>
  );
}

/** The footer row of a ClaimCard: where to check the claim. External verifiers open in a new tab. */
function VerifierLink({
  href,
  label,
  source,
  domain,
  newSite,
}: {
  href: string;
  label: string;
  source: string;
  domain?: string;
  newSite?: string;
}) {
  const className =
    "flex min-h-12 items-center justify-between gap-3 border-t border-sand-200 bg-sand-100 px-4 py-3 hover:bg-sand-200 sm:px-5";
  const inner: ReactNode = (
    <>
      <span className="min-w-0">
        <span className="block font-semibold text-sea-700">{label}</span>
        <span className="block text-sm text-ink-700">{source}</span>
        {domain ? <span className="ltr-run text-sm text-ink-500">{domain}</span> : null}
      </span>
      <ChevronNext className="size-5 shrink-0 text-sea-700" />
    </>
  );
  if (domain) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
        {newSite ? <span className="sr-only">{newSite}</span> : null}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
