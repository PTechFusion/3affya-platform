// Screen 24, Records upload (docs/screens/24-records-upload.md, task 3.7). Above the fold on phone: the dropzone with the camera
// first, then the file list with a per-file status. Then the quote (files, pages, total), the two consents and Pay, which hands
// off to Stripe's hosted page; nothing is processed before payment. Under it, the patient's record sets.
// Prototype switches (?state=): validating (two files still being checked, the quote updating), rejected (three files not
// accepted, each with its reason and fix), quote (four files accepted, consents not yet given), consent (Pay tapped with only
// the privacy box ticked: the AI box shows its error), paying (handed off to Stripe), empty (no record sets yet, one action),
// loading (skeleton, same as loading.tsx). Without ?state= the dropzone is empty and the list shows Noura's four sets.
// Time zone via ?tz= (lib/viewer.ts). The (list) group keeps this loading boundary off /patient/records/[id].
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/format";
import type { DraftFile } from "@/lib/records";
import { recordSetsFor, samplePatient, sampleUploadDraft } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { RecordsSkeleton } from "../_parts/RecordsSkeleton";
import { RecordsUpload, type UploadPreview } from "../_parts/RecordsUpload";
import { SetList } from "../_parts/SetList";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The set the prototype's Pay hand-off leads to: the four accepted draft files, paid and waiting to start. */
const AFTER_PAYMENT = "/patient/records/rs_006";

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "records" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

function uploadPreview(state: string | undefined): UploadPreview {
  const draft = sampleUploadDraft();
  const accepted = draft.files.filter((f) => f.status === "accepted");
  const none = { privacy: false, ai: false };
  switch (state) {
    case "validating":
      return {
        files: accepted.map((f): DraftFile => (draft.checking.includes(f.id) ? { ...f, status: "checking", pages: null } : f)),
        consent: none,
        errors: {},
        paying: false,
      };
    case "rejected":
      return { files: draft.files, consent: none, errors: {}, paying: false };
    case "quote":
      return { files: accepted, consent: none, errors: {}, paying: false };
    case "consent":
      return { files: accepted, consent: { privacy: true, ai: false }, errors: { ai: true }, paying: false };
    case "paying":
      return { files: accepted, consent: { privacy: true, ai: true }, errors: {}, paying: true };
    default:
      return { files: [], consent: none, errors: {}, paying: false };
  }
}

export default async function RecordsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <RecordsSkeleton />;

  const loc = locale as Locale;
  const t = await getTranslations("records");
  const state = typeof sp.state === "string" ? sp.state : undefined;
  const timeZone = typeof sp.tz === "string" ? viewerFrom(sp).timeZone : samplePatient.timeZone;
  const sets = state === "empty" ? [] : recordSetsFor();
  const query = Object.fromEntries(
    (["state", "tz"] as const).flatMap((k) => (typeof sp[k] === "string" ? [[k, sp[k] as string]] : [])),
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead")}</p>
      </header>
      <RecordsUpload key={state ?? "idle"} preview={uploadPreview(state)} progressHref={AFTER_PAYMENT} />
      <SetList sets={sets} locale={loc} timeZone={timeZone} addHref={{ pathname: "/patient/records", query, hash: "add-files" }} />
    </>
  );
}
