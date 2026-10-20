// Screen 14, About (docs/screens/14-about.md). Single column: who 3affya is in two paragraphs with the founder beside them,
// how verification works (the hook: link to the verification explainer, plus the public verifiers, rule X3), the operating
// entity and address (H9), contact, last-reviewed date (X4). States: default, ?state=loading (skeleton). Viewer via ?country=, ?tz=.
// Founder photo, bio, legal entity name and address are honest placeholders until Dr Ayman supplies them (H4: never stock people).
import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Badge, ChevronDown, ChevronNext, LinkButton, SectionHeading, Surface } from "@/components/ui";
import { formatDate, formatNumber, type Locale } from "@/lib/format";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { business } from "@/config/business";
import Loading from "./loading";

// Date this page's copy was last reviewed (rule X4). A calendar date, so it is formatted in UTC and never shifts with the viewer.
const REVIEWED_ON = "2026-10-19";
const CONTACT_EMAIL = business.supportEmail;

// Public verifiers run by US medical bodies (rule X3). Site names are proper nouns and stay in Latin script in both locales.
const VERIFIERS = [
  { key: "Board", site: "Certification Matters", href: "https://www.certificationmatters.org/" },
  { key: "Licence", site: "DocInfo", href: "https://www.docinfo.org/" },
] as const;

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function About({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const viewer = viewerFrom(sp);
  const emergency = emergencyNumberFor(viewer.country);
  const t = await getTranslations("about");
  const tcard = await getTranslations("card");

  const steps = ["1", "2", "3"] as const;
  const reviewed = formatDate(new Date(`${REVIEWED_ON}T00:00:00Z`), "UTC", loc);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
        <section className="md:grid md:grid-cols-[1fr_13rem] md:items-start md:gap-8">
          <div>
            <h1 className="text-3xl font-bold text-sea-900 sm:text-4xl">{t("title")}</h1>
            <p className="mt-4 text-lg text-ink-900">{t("intro1")}</p>
            <p className="mt-4 text-ink-700">{t("intro2")}</p>
            <a href="#verification" className="mt-4 inline-flex items-center gap-1 font-semibold text-sea-700 underline-offset-4 hover:underline">
              {t("jumpToVerification")} <ChevronDown />
            </a>
          </div>
          <Surface className="mt-6 p-4 md:mt-2">
            <figure className="flex items-center gap-4 md:flex-col md:items-stretch">
              <Image
                src="/brand/placeholder-doctor.svg"
                alt=""
                width={120}
                height={120}
                unoptimized
                className="size-20 shrink-0 rounded-2xl md:size-auto md:w-full"
              />
              <figcaption className="min-w-0">
                <p className="font-bold text-sea-900">{t("founderName")}</p>
                <p className="text-sm text-ink-700">{t("founderRole")}</p>
                <p className="mt-1 text-sm text-ink-500">{t("founderPending")}</p>
              </figcaption>
            </figure>
          </Surface>
        </section>

        <section id="verification">
          <SectionHeading title={t("verifyTitle")} lead={t("verifyLead")} />
          <Surface className="sm:p-6">
            <ol className="space-y-6">
              {steps.map((n, i) => (
                <li key={n} className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="tabular inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-lagoon-600 text-lg font-bold text-white"
                  >
                    {formatNumber(i + 1, loc)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-sea-900">{t(`verify${n}Title`)}</h3>
                    <p className="mt-1 text-ink-700">{t(`verify${n}Body`)}</p>
                    {n === "3" ? (
                      <p className="mt-3">
                        <Badge tone="verified">{tcard("verified")}</Badge>
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-6 font-semibold text-ink-900">
              {t("verifyRecheck", { months: formatNumber(business.verifiedReverifyMonths, loc) })}
            </p>

            <div className="mt-6 border-t border-sand-200 pt-6">
              <h3 className="text-lg font-bold text-sea-900">{t("checkTitle")}</h3>
              <p className="mt-1 text-sm text-ink-700">{t("checkLead")}</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {VERIFIERS.map((v) => (
                  <li key={v.key} className="rounded-[var(--radius-field)] bg-sand-50 p-4">
                    <p className="text-sm text-ink-500">{t(`check${v.key}Label`)}</p>
                    <a
                      href={v.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      lang="en"
                      className="ltr-run mt-0.5 font-semibold text-sea-700 underline underline-offset-4 hover:text-sea-800"
                    >
                      {v.site}
                      <span className="sr-only" lang={locale}>
                        {" "}
                        {t("opensNewTab")}
                      </span>
                    </a>
                    <p className="mt-0.5 text-sm text-ink-700">{t(`check${v.key}By`)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Surface>
          <LinkButton href="/why-us-training" className="mt-5">
            {t("verifyLink")} <ChevronNext />
          </LinkButton>
        </section>

        <section>
          <SectionHeading title={t("companyTitle")} />
          <Surface className="sm:p-6">
            <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-[auto_1fr] sm:gap-y-4">
              <dt className="font-semibold text-ink-900">{t("entityLabel")}</dt>
              <dd className="mb-4 text-ink-700 sm:mb-0">{t("entityValue")}</dd>
              <dt className="font-semibold text-ink-900">{t("addressLabel")}</dt>
              <dd className="text-ink-700">{t("addressValue")}</dd>
            </dl>
          </Surface>
        </section>

        <section className="rounded-[var(--radius-card)] bg-sky-100 p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-sea-900">{t("contactTitle")}</h2>
          <p className="mt-1.5 text-ink-700">{t("contactBody")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <LinkButton href="/contact" variant="secondary">
              {t("contactAction")} <ChevronNext />
            </LinkButton>
            <p className="text-ink-700">
              {t("contactEmail")}{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="ltr-run font-semibold text-sea-700 underline-offset-2 hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </section>

        <p className="text-sm text-ink-500">
          {t("lastReviewed")} <time dateTime={REVIEWED_ON}>{reviewed}</time>
        </p>
      </main>
      <SiteFooter emergencyNumber={emergency} />
    </>
  );
}
