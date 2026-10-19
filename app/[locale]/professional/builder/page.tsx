// Screen 29, profile builder (docs/screens/29-profile-builder.md, tasks 1.7, 2.4, 2.5), inside the professional shell.
// Opens pre-filled from the registry row (rule B1); the stage follows the sample data. Prototype switches:
//   ?doctor=doc_013           default: claimed from the registry (invite demo-valid), nothing submitted
//   ?doctor=doc_009           credentials uploaded, pending review (also ?state=pending)
//   ?state=submitted          submitted for review (doc_009 unless ?doctor= names another row with files)
//   ?state=rejected           returned by admin with the reviewer's note (doc_009)
//   ?doctor=doc_002           editing a verified, live profile; ?state=live is the moment of approval
//   ?step=1..6                opens that step; ?coach=0 hides the coach marks (screenshots); ?preview=ar|en sets the card
//   ?state=loading            the skeleton, same as loading.tsx; an unknown ?doctor= shows the not-found state
// Viewer time zone via ?tz= (lib/viewer.ts).
import type { Metadata } from "next";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { EmptyState, LinkButton } from "@/components/ui";
import { formatDate, type Locale } from "@/lib/format";
import {
  builderRowFor,
  doctorById,
  sampleInstant,
  sampleSpecialties,
  upcomingSlots,
  usStates,
  type SampleDoctor,
} from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { BuilderSkeleton } from "./_parts/BuilderSkeleton";
import { ProfileBuilder } from "./_parts/ProfileBuilder";
import { defaultDoctorFor, initialDraft, initialStep, stageFor } from "./_parts/initial";
import { ITEM_STEP, REQUIRED_ITEMS, STEPS, isVerifiedStage, missingFor, type ChecklistKey } from "./_parts/model";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "builder" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

/** The strings the card needs in each preview language: its own, the shared ones and the language names. */
async function previewMessages(): Promise<Record<Locale, AbstractIntlMessages>> {
  const pick = (m: AbstractIntlMessages): AbstractIntlMessages => ({
    card: m.card ?? {},
    common: m.common ?? {},
    languages: m.languages ?? {},
  });
  const [ar, en] = await Promise.all([getMessages({ locale: "ar" }), getMessages({ locale: "en" })]);
  return { ar: pick(ar), en: pick(en) };
}

export default async function BuilderPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const state = str(sp.state);
  if (state === "loading") return <BuilderSkeleton />;

  const loc = locale as Locale;
  const t = await getTranslations("builder");
  const doctor = doctorById(str(sp.doctor) ?? defaultDoctorFor(state));
  if (!doctor) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
        <EmptyState
          title={t("notFound.title")}
          body={t("notFound.body")}
          action={<LinkButton href="/for-professionals#find-profile">{t("notFound.action")}</LinkButton>}
        />
      </>
    );
  }

  const viewer = viewerFrom(sp);
  const row = builderRowFor(doctor.id);
  const stage = stageFor(doctor, row, state);
  const draft = initialDraft(doctor, row, stage);
  const hasAvailability = upcomingSlots(doctor.id).length > 0;
  const thisYear = new Date().getUTCFullYear();
  const ctx = { npi: doctor.npi, hasAvailability, thisYear };
  const firstMissing = REQUIRED_ITEMS.find((k) => missingFor(k, draft, ctx));
  const registryKeys = (["name", "specialty", "npi", "languages"] as ChecklistKey[]).filter((k) => !missingFor(k, draft, ctx));
  const date = (iso: string | null | undefined) => (iso ? formatDate(sampleInstant(iso), viewer.timeZone, loc) : undefined);
  const rejectedFile = stage === "rejected" && row?.rejection ? row.files.find((f) => f.id === row.rejection?.fileId) : undefined;
  const preview = str(sp.preview);
  const step = initialStep(str(sp.step), stage, firstMissing ? ITEM_STEP[firstMissing] : undefined);
  const base: SampleDoctor = doctor;

  return (
    <ProfileBuilder
      doctorId={doctor.id}
      base={base}
      npi={doctor.npi}
      initialDraft={draft}
      initialStage={stage}
      initialStep={STEPS.includes(step) ? step : "photo"}
      registryKeys={registryKeys}
      hasAvailability={hasAvailability}
      timeZone={viewer.timeZone}
      thisYear={thisYear}
      coach={str(sp.coach) !== "0"}
      initialPreview={preview === "ar" || preview === "en" ? preview : loc}
      previewMessages={await previewMessages()}
      specialties={sampleSpecialties}
      states={usStates}
      dates={{ submitted: date(row?.submittedAtUtc), decided: date(row?.decidedAtUtc) }}
      rejection={
        rejectedFile && row?.rejection
          ? { kind: rejectedFile.kind, reason: loc === "ar" ? row.rejection.reasonAr : row.rejection.reasonEn, reasonLang: loc }
          : undefined
      }
      publicHref={isVerifiedStage(stage) ? `/doctors/${doctor.id}` : undefined}
    />
  );
}
