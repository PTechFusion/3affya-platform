// Screen 36, one shared summary (docs/screens/36-shared-summaries.md, task 3.10). The patient's one-page summary through the
// shared SummaryViewer (screen 26 renders the same component): AI label, reviewed state and Talk to a human at the top
// (rules T4, Q6), not-a-diagnosis in the body (T5), share dates and who can see it under the title (T7). Open in visit notes
// sits in the top panel; Mark as reviewed sits in the review panel after the summary, so the tap comes after the reading.
// Sample shares for doc_002: sh_001 new (one flag, one unreadable page), sh_002 viewed (a conflict and a missing document),
// sh_003 reviewed by this doctor (nothing flagged, no procedures found). Any other id, or an ended share, is a 404 (layout.tsx).
// Prototype switches: ?state=loading (skeleton, same as loading.tsx); ?state=marked (after Mark as reviewed, on sh_001 or
// sh_002: the confirmation, and the top shows what the patient will now see). Time zone via ?tz= (lib/viewer.ts).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Breadcrumbs, CheckIcon, LinkButton, Surface } from "@/components/ui";
import { SummaryViewer } from "@/components/brand/SummaryViewer";
import { formatDate, type Locale } from "@/lib/format";
import { doctorById, sampleProfessionalId, shareFor } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { MarkReviewed } from "./_parts/MarkReviewed";
import { ViewerSkeleton } from "./_parts/ViewerSkeleton";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// No patient name in the title: tab titles end up in history, bookmarks and screen shares.
export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shared.viewer" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function SharedSummaryPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  if (sp.state === "loading") return <ViewerSkeleton />;

  const share = shareFor(id, sampleProfessionalId);
  if (!share) notFound(); // layout.tsx already answered 404; this narrows the type
  const { timeZone } = viewerFrom(sp);
  const t = await getTranslations("shared");
  const tp = await getTranslations("portal");
  const ts = await getTranslations("summary");

  const ar = loc === "ar";
  const { patient, data } = share.summary;
  const name = ar ? patient.firstNameAr : patient.firstNameEn;
  const me = doctorById(sampleProfessionalId);
  const meAsReviewer = me ? { name: ar ? me.nameAr : me.nameEn, gender: me.gender } : undefined;
  const title = t("viewer.title", { name });

  // The licensed reviewer shown at the top. ?state=marked previews the summary right after this doctor marks it reviewed.
  const marked = sp.state === "marked" && share.status !== "reviewed";
  const reviewer = share.summary.review ? doctorById(share.summary.review.professionalId) : undefined;
  const review =
    share.summary.review && reviewer
      ? { name: ar ? reviewer.nameAr : reviewer.nameEn, gender: reviewer.gender, at: share.summary.review.at }
      : marked && meAsReviewer
        ? { ...meAsReviewer, at: new Date() }
        : null;

  return (
    <>
      <Breadcrumbs
        label={t("viewer.breadcrumb")}
        items={[
          { label: tp("professional.title"), href: "/professional" },
          { label: t("title"), href: "/professional/shared" },
          { label: title },
        ]}
      />
      <h1 className="mt-3 text-2xl font-bold text-sea-900 sm:text-3xl">{title}</h1>
      <p className="mt-1.5 max-w-3xl text-ink-700">
        {t("viewer.shareLine", { shared: formatDate(share.sharedAt, timeZone, loc), expires: formatDate(share.expiresAt, timeZone, loc) })}
      </p>
      <div className="mt-5">
        <SummaryViewer
          summary={data}
          locale={loc}
          timeZone={timeZone}
          audience="professional"
          patientName={name}
          review={review}
          humanHref="/contact"
          actions={
            <LinkButton href="/professional/inbox" variant="secondary" className="w-full sm:w-auto">
              {t("viewer.openNotes")}
            </LinkButton>
          }
        />
      </div>

      {/* Review after reading: the panel follows the summary on purpose (rules T4, Q6). */}
      <section aria-labelledby="review-title" className="mt-6">
        <Surface>
          <h2 id="review-title" className="text-xl font-bold text-sea-900">
            {t("viewer.reviewTitle")}
          </h2>
          <div className="mt-3">
            {share.status === "reviewed" && share.summary.review ? (
              <p className="flex items-start gap-2 text-ink-900">
                <CheckIcon className="mt-1.5 size-4 shrink-0 text-success" />
                {t("viewer.reviewedByYou", { date: formatDate(share.summary.review.at, timeZone, loc) })}
              </p>
            ) : (
              <MarkReviewed
                shareId={share.id}
                patientName={name}
                gender={patient.gender}
                reviewed={meAsReviewer ? ts("reviewedBy", meAsReviewer) : ""}
                initial={marked ? { ok: true } : null}
              />
            )}
          </div>
          <p className="mt-4 border-t border-sand-200 pt-4 text-sm text-ink-700">{t("viewer.endsNote", { name, gender: patient.gender })}</p>
        </Surface>
      </section>
    </>
  );
}
