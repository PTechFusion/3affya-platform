// Screen 31, practice ID card (docs/screens/31-practice-id-card.md, task 2.7). The one DoctorCard in ID card mode, shown large,
// with a side switch, a card-language switch (the card can be Arabic on the English page and the reverse) and downloads: PNG per
// side and a two-page PDF, made in the browser (see _parts/card-image.ts). Until the credentials are approved both faces carry
// an Unverified stamp (rules C8, A2). Prototype switches:
//   ?doctor=doc_009         the signed-in doctor is pending review: the Unverified stamp (default doc_002, verified)
//   ?side=back              open on the back (default front)
//   ?lang=en | ?lang=ar     card language (default: the page language)
//   ?state=loading          the skeleton, same as loading.tsx
//   ?state=downloadError    the download error line, as after a failed download
import type { Metadata } from "next";
import type { AbstractIntlMessages } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Badge, LinkButton, Surface } from "@/components/ui";
import { business } from "@/config/business";
import { verifiers } from "@/config/verifiers";
import { formatDate, formatNumber, type Locale } from "@/lib/format";
import { doctorById, profileFor, toDoctorCardData } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { CardPageSkeleton } from "./_parts/CardPageSkeleton";
import { CardStudio, type Side } from "./_parts/CardStudio";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

/** Prototype: the signed-in professional. Production reads the doctor row of the session user. */
const SIGNED_IN_DOCTOR = "doc_002";

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "idCard" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false } };
}

/** A calendar date (YYYY-MM-DD) plus whole months, as an instant at UTC midnight; format it in UTC so no zone moves the day. */
function calendarDate(iso: string, plusMonths = 0): Date {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + plusMonths, d));
}

export default async function PracticeIdCard({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <CardPageSkeleton />;

  const doctor = doctorById(typeof sp.doctor === "string" ? sp.doctor : SIGNED_IN_DOCTOR);
  if (!doctor) notFound();
  const loc = locale as Locale;
  const viewer = viewerFrom(sp);
  const t = await getTranslations("idCard");
  const tcard = await getTranslations("card");

  // The card in both languages, with the messages it reads, so the language switch needs no round trip.
  const inLanguage = async (l: Locale) => {
    const tl = await getTranslations({ locale: l, namespace: "languages" });
    const ti = await getTranslations({ locale: l, namespace: "idCard" });
    const all = (await getMessages({ locale: l })) as Record<string, AbstractIntlMessages>;
    return {
      card: toDoctorCardData(doctor, l, viewer.timeZone, tl),
      messages: { card: all.card ?? {}, common: all.common ?? {} } as AbstractIntlMessages,
      watermark: ti("watermark"),
    };
  };
  const [ar, en] = await Promise.all([inLanguage("ar"), inLanguage("en")]);

  const verified = doctor.state === "verified";
  const side: Side = sp.side === "back" ? "back" : "front";
  const lang: Locale = sp.lang === "en" || sp.lang === "ar" ? sp.lang : loc;
  const fileBase = `3affya-card-${doctor.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

  const months = business.verifiedReverifyMonths;
  const board = profileFor(doctor.id)?.board;
  const link = "font-semibold text-sea-700 underline-offset-2 hover:underline";

  const verification = (
    <section aria-labelledby="card-verify-title">
      <Surface>
        <h2 id="card-verify-title" className="text-xl font-bold text-sea-900">
          {t("verify.title")}
        </h2>
        {verified && doctor.verifiedOn ? (
          <>
            {/* Rule C8: the badge in words with its date; rule A2: when it is checked again. */}
            <div className="mt-3">
              <Badge tone="verified">{t("verify.verifiedOn", { date: formatDate(calendarDate(doctor.verifiedOn), "UTC", loc) })}</Badge>
            </div>
            <p className="mt-2 text-sm text-ink-700">
              {t("verify.verifiedBody", {
                months,
                monthsLabel: formatNumber(months, loc),
                due: formatDate(calendarDate(doctor.verifiedOn, months), "UTC", loc),
              })}
            </p>
            {doctor.boardCertified && board ? (
              <dl className="mt-4 border-t border-sand-200 pt-3">
                <dt className="text-sm font-semibold text-ink-500">{t("verify.board")}</dt>
                <dd className="mt-0.5 text-ink-900">
                  <bdi>{board}</bdi>
                  <p className="mt-1 text-sm">
                    <a href={verifiers.board.href} target="_blank" rel="noopener noreferrer" className={link}>
                      {t("verify.checkOn")} <span className="ltr-run">{verifiers.board.domain}</span>
                    </a>
                  </p>
                </dd>
              </dl>
            ) : null}
          </>
        ) : (
          <>
            <div className="mt-3">
              <Badge tone="pending">{tcard("pending")}</Badge>
            </div>
            <p className="mt-2 text-ink-700">{t("verify.pendingBody")}</p>
            <LinkButton href="/professional/builder" variant="secondary" className="mt-4">
              {t("verify.pendingAction")}
            </LinkButton>
          </>
        )}
      </Surface>
    </section>
  );

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-ink-700">{t("lead")}</p>
      </header>
      <CardStudio
        state={doctor.state}
        cards={{ ar: ar.card, en: en.card }}
        messages={{ ar: ar.messages, en: en.messages }}
        watermarks={verified ? undefined : { ar: ar.watermark, en: en.watermark }}
        timeZone={viewer.timeZone}
        initialSide={side}
        initialLang={lang}
        fileBase={fileBase}
        initialError={sp.state === "downloadError"}
      >
        {verification}
      </CardStudio>
    </div>
  );
}
