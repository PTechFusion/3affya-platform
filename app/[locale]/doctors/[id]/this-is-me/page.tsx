// Screen 10, This is me / remove me (docs/screens/10-this-is-me-remove-me.md). A short form: two radio cards (This is me,
// Remove me) that change the copy, then full name, NPI, email and, for removal, the reason (rules F1 F2 F5 U4). The mini
// DoctorCard names the profile in question. Submitted: what happens next and the 48-hour promise (U4 A3).
// States: default (nothing chosen); ?intent=claim; ?intent=remove; ?state=submitted (removal; add &intent=claim for the claim
// link); ?state=invalid (specific field errors); ?state=error (send failed, input kept); ?state=loading (skeleton).
// Data: unclaimed ids doc_013..doc_020 show the form; a claimed id (doc_001..doc_012) explains it is already claimed and gives
// the two ways forward (L4); an unknown id is a 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { Badge, LinkButton, Surface } from "@/components/ui";
import { business } from "@/config/business";
import { formatNumber, type Locale } from "@/lib/format";
import { sampleDoctors, toDoctorCardData, type SampleDoctor } from "@/lib/sample";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { ThisIsMeForm, type ThisIsMeStatus } from "./ThisIsMeForm";
import { isIntent, validateThisIsMe, type Intent, type ThisIsMeErrors, type ThisIsMeInput } from "./validation";
import ThisIsMeLoading from "./loading";

// Synthetic inputs for the state previews only.
const DEMO_EMAIL = "doctor@example.com";
const DEMO_EMAIL_NO_DOT = "doctor@example";
const TITLE_ID = "this-is-me-title";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const findDoctor = (id: string): SampleDoctor | undefined => sampleDoctors.find((d) => d.id === id);
const displayName = (d: SampleDoctor, locale: Locale) => (locale === "ar" ? d.nameAr : d.nameEn);
/** The name a doctor would type: the profile name without the title. Preview values only. */
const typedName = (d: SampleDoctor, locale: Locale) => (locale === "ar" ? d.nameAr.replace(/^د\.\s*/, "") : d.nameEn.replace(/^Dr\.?\s+/, ""));

async function slaLabel(locale: string) {
  const t = await getTranslations({ locale, namespace: "thisIsMe" });
  const hours = business.removalSlaHours;
  return t("sla", { hours, count: formatNumber(hours, locale as Locale) });
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "thisIsMe" });
  const doctor = findDoctor(id);
  return {
    title: doctor ? t("metaTitle", { name: displayName(doctor, locale as Locale) }) : t("titleGeneric"),
    description: t("metaDescription", { sla: await slaLabel(locale) }),
    // A request form, not content: keep it out of search results.
    robots: { index: false, follow: false },
  };
}

export default async function ThisIsMePage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  const state = typeof sp.state === "string" ? sp.state : undefined;
  if (state === "loading") return <ThisIsMeLoading />;

  const doctor = findDoctor(id);
  if (!doctor) notFound();

  const viewer = viewerFrom(sp);
  const t = await getTranslations("thisIsMe");
  const tl = await getTranslations("languages");
  const tcard = await getTranslations("card");
  const sla = await slaLabel(locale);
  const name = displayName(doctor, loc);
  const claimed = doctor.state !== "unclaimed";

  // Which profile this is. Phone: one line (state badge, specialty, city) so the whole form fits the first screen, as the layout
  // call asks. Desktop: the mini DoctorCard beside the form. Claimed profiles keep the line at every width: the mini card's
  // front does not fit the verified badge plus the board-certified mark (reported to the card owner, not patched here).
  const identity = (
    <p className={["flex flex-wrap items-center gap-x-2 gap-y-1", claimed ? "" : "md:hidden"].join(" ")}>
      <Badge tone={doctor.state}>{tcard(doctor.state)}</Badge>
      <span className="text-sm text-ink-700">
        {loc === "ar" ? doctor.specialtyAr : doctor.specialtyEn} · {loc === "ar" ? doctor.cityAr : doctor.cityEn}
      </span>
    </p>
  );
  const card = claimed ? null : (
    <div className="hidden md:block">
      <DoctorCard doctor={toDoctorCardData(doctor, loc, viewer.timeZone, tl)} state={doctor.state} size="mini" side="front" />
    </div>
  );

  let body: React.ReactNode;
  if (claimed) {
    body = (
      <Surface>
        <section aria-labelledby="claimed-you" className="flex flex-col gap-3">
          <h2 id="claimed-you" className="text-lg font-bold text-sea-900">
            {t("claimed.youTitle", { name })}
          </h2>
          <p className="text-ink-700">{t("claimed.youBody")}</p>
          <LinkButton href="/professional" className="w-full sm:w-auto sm:self-start">
            {t("claimed.portal")}
          </LinkButton>
        </section>
        <section aria-labelledby="claimed-not-you" className="mt-6 flex flex-col gap-3 border-t border-sand-200 pt-6">
          <h2 id="claimed-not-you" className="text-lg font-bold text-sea-900">
            {t("claimed.notYouTitle")}
          </h2>
          <p className="text-ink-700">{t("claimed.notYouBody")}</p>
          <LinkButton href="/contact" variant="secondary" className="w-full sm:w-auto sm:self-start">
            {t("claimed.report")}
          </LinkButton>
        </section>
      </Surface>
    );
  } else {
    // The previews default to removal: the submitted state the brief asks for is the 48-hour promise.
    const preview = state === "submitted" || state === "error" || state === "invalid";
    const previewIntent: Intent = isIntent(sp.intent) ? sp.intent : "remove";
    const initialIntent: Intent | undefined = isIntent(sp.intent) || preview ? previewIntent : undefined;
    const demo: ThisIsMeInput = {
      name: typedName(doctor, loc),
      npi: doctor.npi,
      email: DEMO_EMAIL,
      reason: previewIntent === "remove" ? "notListed" : "",
      details: "",
    };
    let initialValues: ThisIsMeInput = { name: "", npi: "", email: "", reason: "", details: "" };
    let initialErrors: ThisIsMeErrors = {};
    let initialStatus: ThisIsMeStatus = "form";
    if (state === "submitted") {
      initialValues = demo;
      initialStatus = "submitted";
    } else if (state === "error") {
      initialValues = demo;
      initialStatus = "failed";
    } else if (state === "invalid") {
      // One missing digit, an address with no dot, and no name or reason: four different, specific errors.
      initialValues = { name: "", npi: doctor.npi.slice(0, -1), email: DEMO_EMAIL_NO_DOT, reason: "", details: "" };
      initialErrors = validateThisIsMe(previewIntent, initialValues);
    }
    body = (
      <Surface>
        <ThisIsMeForm
          key={`${state ?? "form"}-${initialIntent ?? "none"}`}
          doctorId={doctor.id}
          titleId={TITLE_ID}
          initialIntent={initialIntent}
          initialValues={initialValues}
          initialErrors={initialErrors}
          initialStatus={initialStatus}
          slaLabel={sla}
        />
      </Surface>
    );
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-12">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-start md:gap-10">
          <header className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 id={TITLE_ID} className="text-3xl font-bold text-sea-900 sm:text-4xl">
                {claimed ? t("claimed.title") : t("title", { name })}
              </h1>
              {identity}
              <p className="text-ink-700">{claimed ? t("claimed.lead", { name }) : t("lead")}</p>
            </div>
            {card}
          </header>
          {body}
        </div>
      </main>
      <SiteFooter emergencyNumber={emergencyNumberFor(viewer.country)} />
    </>
  );
}
