// Screen 38, credential review queue (docs/screens/38-credential-review-queue.md, task 2.8), inside the admin shell.
// Every claim waiting for a decision, oldest submission first: the doctor, what was submitted and when (reviewer's zone, zone
// named), how long it has waited, its status and an SLA badge (config credentialReview). A row opens /admin/review/[id], the
// claim with its checklist; on desktop the queue stays beside it as a column.
// Data: pending doctors with a submission in data/sample/builder.json: doc_009 (oldest, overdue), doc_012 (resubmitted after a
// return, overdue), doc_010 (due within a day), doc_011 (board eligible, on time). doc_013 is unclaimed, so it is not here.
// States: queue (default); ?state=empty (one action, rule L3); ?state=loading (same as loading.tsx); ?state=error (the queue
// did not load). Viewer: ?tz= sets the reviewer's zone (default sampleAdmin.timeZone).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, LinkButton, Notice } from "@/components/ui";
import { credentialReview } from "@/config/business";
import { formatNumber, type Locale } from "@/lib/format";
import { QueueList } from "./_parts/QueueList";
import { QueueHeader, QueueSkeleton } from "./_parts/ReviewSkeleton";
import { adminZone, reviewHref, reviewQueue, type SearchParams } from "./_parts/queue";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminReview" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function ReviewQueuePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <QueueSkeleton />;

  const loc = locale as Locale;
  const t = await getTranslations("adminReview");

  if (sp.state === "error") {
    return (
      <div className="flex flex-col gap-6">
        <QueueHeader title={t("title")} />
        <Notice
          tone="danger"
          role="alert"
          title={t("error.title")}
          body={t("error.body")}
          action={<LinkButton href={reviewHref(undefined, sp)}>{t("error.action")}</LinkButton>}
        />
      </div>
    );
  }

  const now = new Date();
  const zone = adminZone(sp);
  const claims = sp.state === "empty" ? [] : reviewQueue(now);
  const overdue = claims.filter((c) => c.sla === "overdue").length;
  const count = (n: number) => ({ count: n, countLabel: formatNumber(n, loc) });

  if (!claims.length) {
    return (
      <div className="flex flex-col gap-6">
        <QueueHeader title={t("title")} />
        <EmptyState title={t("empty.title")} body={t("empty.body")} action={<LinkButton href="/admin/listings">{t("empty.action")}</LinkButton>} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <QueueHeader
        title={t("title")}
        lead={`${t("lead.waiting", count(claims.length))} ${overdue ? t("lead.overdue", count(overdue)) : t("lead.noneOverdue")}`}
      />
      <p className="-mt-3 text-sm text-ink-700">
        {t("lead.order", { hours: credentialReview.slaHours, hoursLabel: formatNumber(credentialReview.slaHours, loc) })}
      </p>
      <QueueList claims={claims} locale={loc} zone={zone} sp={sp} now={now} />
    </div>
  );
}
