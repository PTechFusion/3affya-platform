// Screen 26, summary and timeline (docs/screens/26-summary-and-timeline.md, tasks 3.9 and 3.10). The patient's one-page summary
// through the shared SummaryViewer (screen 36 renders the same component for the professional): AI label, reviewed state and
// Talk to a human at the top (rules T4, Q6), released at once with a framing line (T2), not-a-diagnosis in the body (T5), then
// the Overview, Timeline and Flags tabs. Every item links to its source page, which opens in a sheet (T6, the hook); Download
// or print is the primary action beside viewing (T1); the timeline axis sits at the start edge (R11).
// Sample record sets (data/sample/summaries.json; the layout answers 404 for any other id):
//   rs_001  the signed-in patient's: not yet reviewed, a missing document, one unreadable handwritten page (partly unreadable)
//   rs_002  two documents disagree about an allergy, plus a missing document; every page read
//   rs_003  reviewed by Dr Omar Khalil; nothing flagged, no procedures found
// Prototype switches: ?tab=timeline|flags; ?doc=d1&page=1 opens that source page; ?state=loading (skeleton, same as
// loading.tsx), ?state=empty (no summary yet), ?state=error; ?tz= for the time zone (lib/viewer.ts).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { EmptyState, LinkButton, Surface } from "@/components/ui";
import { SummarySourceSheet, SummaryViewer, summaryViews, type SummarySourceRef, type SummaryView } from "@/components/brand/SummaryViewer";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/format";
import { doctorById, samplePatient, summaryForRecordSet } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { DownloadSummary } from "./_parts/DownloadSummary";
import { SummaryPageHeader } from "./_parts/SummaryPageHeader";
import { SummaryPageSkeleton } from "./_parts/SummaryPageSkeleton";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "patientSummary" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

/** The page URL with only the given query params (empty ones dropped). */
function withQuery(base: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function PatientSummaryPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  if (sp.state === "loading") return <SummaryPageSkeleton />;

  const summary = summaryForRecordSet(id);
  if (!summary) notFound(); // layout.tsx already answered 404; this narrows the type
  const t = await getTranslations("patientSummary");
  const tc = await getTranslations("common");
  const base = `/patient/records/${id}/summary`;
  const tz = typeof sp.tz === "string" ? sp.tz : undefined;

  // No summary yet: the documents are still being read. One action, to the progress page (screen 25, rule L3).
  if (sp.state === "empty") {
    return (
      <>
        <SummaryPageHeader />
        <div className="mt-5">
          <EmptyState
            title={t("notReady.title")}
            body={t("notReady.body")}
            action={<LinkButton href={withQuery(`/patient/records/${id}`, { tz })}>{t("notReady.action")}</LinkButton>}
          />
        </div>
      </>
    );
  }

  // The summary could not be loaded: say so, keep the documents' safety in the first line, offer a retry and a person (L4).
  if (sp.state === "error") {
    return (
      <>
        <SummaryPageHeader />
        <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-danger/40 bg-white p-5">
          <h2 className="text-xl font-bold text-sea-900">{t("error.title")}</h2>
          <p className="mt-1.5 max-w-2xl text-ink-700">{t("error.body")}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <LinkButton href={withQuery(base, { tz })} className="w-full sm:w-auto">
              {t("error.retry")}
            </LinkButton>
            <LinkButton href="/contact" variant="ghost" className="w-full sm:w-auto">
              {tc("talkToHuman")}
            </LinkButton>
          </div>
        </div>
      </>
    );
  }

  const ar = loc === "ar";
  // The patient reads dates in their own zone unless ?tz= says otherwise.
  const timeZone = tz ? viewerFrom(sp).timeZone : samplePatient.timeZone;
  const view: SummaryView = summaryViews.find((v) => v === sp.tab) ?? "overview";
  const tab = view === "overview" ? undefined : view;
  const reviewer = summary.review ? doctorById(summary.review.professionalId) : undefined;
  const review =
    summary.review && reviewer ? { name: ar ? reviewer.nameAr : reviewer.nameEn, gender: reviewer.gender, at: summary.review.at } : null;

  const tabHref = (v: SummaryView) => withQuery(base, { tab: v === "overview" ? undefined : v, tz });
  const sourceHref = (ref: SummarySourceRef) => withQuery(base, { tab, doc: ref.doc, page: String(ref.page), tz });
  const docParam = typeof sp.doc === "string" ? sp.doc : undefined;
  const pageParam = typeof sp.page === "string" ? Number(sp.page) : Number.NaN;
  const source = docParam && Number.isInteger(pageParam) ? { doc: docParam, page: pageParam } : null;
  // The fix for an unreadable page: a clearer photo, uploaded from Records (screen 24).
  const uploadClearer = (
    <LinkButton href="/patient/records" variant="secondary" className="w-full sm:w-auto">
      {t("uploadClearer")}
    </LinkButton>
  );

  return (
    <>
      <SummaryPageHeader />
      {/* Released at once, with a framing line before anything else (rules T2, X1). */}
      <p className="mt-1.5 max-w-3xl text-ink-700">{t("lead")}</p>
      <div className="mt-5">
        <SummaryViewer
          summary={summary.data}
          locale={loc}
          timeZone={timeZone}
          audience="patient"
          patientName={ar ? summary.patient.firstNameAr : summary.patient.firstNameEn}
          review={review}
          humanHref="/contact"
          view={view}
          tabHref={tabHref}
          sourceHref={sourceHref}
          unreadableAction={uploadClearer}
          actions={
            <div className="flex flex-col gap-3 sm:flex-row">
              <DownloadSummary label={t("download")} />
              <LinkButton href="/patient/sharing" variant="secondary" className="w-full sm:w-auto">
                {t("share")}
              </LinkButton>
            </div>
          }
        />
      </div>

      {/* Something missing? (rule T6): the summary only knows what was uploaded. */}
      <section aria-labelledby="summary-missing" className="mt-6 print:hidden">
        <Surface className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="summary-missing" className="text-lg font-bold text-sea-900">
              {t("missing.title")}
            </h2>
            <p className="mt-1 text-ink-700">{t("missing.body")}</p>
          </div>
          <Link
            href="/patient/records"
            className="inline-flex min-h-11 shrink-0 items-center font-semibold text-sea-700 underline-offset-2 hover:underline"
          >
            {t("missing.action")}
          </Link>
        </Surface>
      </section>

      {source ? (
        <SummarySourceSheet
          summary={summary.data}
          locale={loc}
          source={source}
          closeHref={withQuery(base, { tab, tz })}
          pageHref={sourceHref}
          unreadableAction={uploadClearer}
        />
      ) : null}
    </>
  );
}
