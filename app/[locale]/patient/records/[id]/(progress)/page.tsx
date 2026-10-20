// Screen 25, Records processing (docs/screens/25-records-processing.md, task 3.8). One card: the overall status line, the nine
// fixed pipeline steps with the current one live (rule T11; no fake percentage: the bar is pages done of pages), the price and
// the time left, and Cancel (over 10 seconds, rule L1). Below: what you will get as three lines, then every file with its
// pages, unreadable ones flagged with the page reference. Never a blank wait.
// Sample sets for Noura (data/sample/records.json): rs_006 queued (paid, waiting to start), rs_004 processing (page 2 flagged
// unreadable while reading continues), rs_005 failed (page 4 of one file damaged: re-upload it, same quote), rs_001 done (one
// page unreadable; links to the summary, screen 26). rs_002 and rs_003 belong to other patients, so they are a 404 here, like
// any unknown id (layout.tsx). Switches: ?state=cancelled (after Cancel, on rs_004 or rs_006), ?state=loading (skeleton, same
// as loading.tsx). Time zone via ?tz=. Prototype: a snapshot; the live version refreshes as the Inngest steps report.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Breadcrumbs, ChevronNext, LinkButton, ProgressBar, Surface } from "@/components/ui";
import { business } from "@/config/business";
import { formatDate, formatMoney, formatNumber, formatTimeInZone, type Locale } from "@/lib/format";
import { estimateSeconds, stepStates, type PipelineStep, type RecordSetStatus } from "@/lib/records";
import { recordSetFor, samplePatient } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { CancelProcessing } from "../../_parts/CancelProcessing";
import { FilesPages } from "../../_parts/FilesPages";
import { AlertIcon } from "../../_parts/icons";
import { counted, isolate } from "../../_parts/labels";
import { ProgressSkeleton } from "../../_parts/ProgressSkeleton";
import { progressOf } from "../../_parts/progress";
import { RetryAction } from "../../_parts/RetryAction";
import { StepList } from "../../_parts/StepList";
import { WhatYouGet } from "../../_parts/WhatYouGet";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "recordSet" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function RecordSetPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <ProgressSkeleton />;

  const set = recordSetFor(id);
  if (!set) notFound(); // layout.tsx already answered 404; this narrows the type
  const loc = locale as Locale;
  const t = await getTranslations("recordSet");
  const tr = await getTranslations("records");
  const tp = await getTranslations("portal.patient");
  const timeZone = typeof sp.tz === "string" ? viewerFrom(sp).timeZone : samplePatient.timeZone;

  const status: RecordSetStatus = sp.state === "cancelled" && (set.status === "queued" || set.status === "processing") ? "cancelled" : set.status;
  const p = progressOf(set, status);
  const n = (v: number) => formatNumber(v, loc);
  const price = formatMoney(p.quote.totalCents, business.currencyPresentment, loc);
  const date = (d: Date) => formatDate(d, timeZone, loc);
  const live = status === "queued" || status === "processing";
  const seconds = live ? estimateSeconds(p.left) : 0;
  const filesLabel = tr("sets.files", counted(set.files.length, loc));
  const pagesLabel = tr("sets.pages", counted(p.total, loc));
  const failedFile = p.failedPage?.file;
  const refOf = (page: { n: number; file: { name: string } }) => t("pageRef", { page: n(page.n), file: isolate(page.file.name) });

  const statusLine =
    status === "queued"
      ? t("status.queued", { pages: pagesLabel })
      : status === "processing"
        ? t("status.processing", { done: n(p.done), total: n(p.total) })
        : status === "failed"
          ? t("status.failed", { page: n(p.failedPage?.n ?? p.done + 1), total: n(p.total) })
          : status === "cancelled"
            ? t("status.cancelled", { done: n(p.done), total: n(p.total) })
            : t("status.done", { total: n(p.total) });

  // The detail line under each step (rule T11: "Reading page 5 of 12"). Steps not reached yet have none.
  const states = stepStates(status, set.step);
  // Only the lines that add something: the lead already gives the files, pages and upload date, and the card's last row the
  // price, so Checking files, Setting the price and an approved Payment carry no line. Keeps the card above the fold on phone.
  const details: Partial<Record<PipelineStep, string>> = {
    pay: status === "done" && set.paidAt ? t("steps.pay.paid", { date: date(set.paidAt) }) : undefined,
  };
  if (states.extract === "current") {
    details.extract =
      status === "queued"
        ? t("steps.extract.queued", { pages: pagesLabel })
        : p.reading
          ? t("steps.extract.reading", { page: n(p.reading.n), total: n(p.total) })
          : undefined;
  } else if (states.extract === "failed" && p.failedPage) {
    details.extract = t("steps.extract.failed", { page: n(p.failedPage.n), total: n(p.total) });
  } else if (states.extract === "stopped") {
    details.extract = t("steps.extract.stopped", { done: n(p.done), total: n(p.total) });
  } else if (states.extract === "done") {
    details.extract = p.unreadable.length
      ? t("steps.extract.doneUnreadable", { pages: pagesLabel, ...counted(p.unreadable.length, loc) })
      : t("steps.extract.done", { pages: pagesLabel });
  }

  // While reading: the page numbers only, one line (the files section below names the file, the reason and the fix). Once
  // the set has stopped: the full page references.
  const unreadableLine = !p.unreadable.length
    ? null
    : live
      ? t("unreadable.soFar", { ...counted(p.unreadable.length, loc), pages: p.unreadable.map((u) => n(u.n)).join(tr("file.listSep")) })
      : t("unreadable.done", { ...counted(p.unreadable.length, loc), pages: p.unreadable.map(refOf).join(tr("file.listSep")) });

  return (
    <>
      <Breadcrumbs
        label={t("breadcrumbs")}
        items={[
          { label: tp("title"), href: "/patient" },
          { label: tp("nav.records"), href: "/patient/records" },
          { label: t("crumb", { date: date(set.createdAt) }) },
        ]}
      />
      <header className="mb-5 mt-3">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t(`title.${status}`)}</h1>
        <p className="mt-1 text-ink-700">{t("lead", { date: date(set.createdAt), files: filesLabel, pages: pagesLabel })}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <Surface className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <p aria-live="polite" className="tabular text-lg font-bold text-ink-900">
                {statusLine}
              </p>
              {live ? (
                <p className="text-sm text-ink-700">
                  {seconds < 60
                    ? t("estimate.underMinute")
                    : t(status === "queued" ? "estimate.total" : "estimate.left", counted(Math.ceil(seconds / 60), loc))}
                </p>
              ) : null}
            </div>
            {live ? <ProgressBar value={p.done} max={p.total} label={t("progressLabel")} valueText={t("status.processing", { done: n(p.done), total: n(p.total) })} /> : null}
          </div>

          {status === "done" ? (
            <div className="flex flex-col gap-2">
              <LinkButton href={`/patient/records/${set.id}/summary`} size="lg" className="w-full sm:w-auto sm:self-start">
                {t("done.open")}
                <ChevronNext />
              </LinkButton>
              {set.finishedAt ? (
                <p className="text-sm text-ink-700">
                  {t("done.finished", { date: date(set.finishedAt), time: formatTimeInZone(set.finishedAt, timeZone, loc) })}
                </p>
              ) : null}
            </div>
          ) : null}

          {status === "failed" && set.failure ? (
            <section aria-labelledby="failure-title" className="rounded-[var(--radius-field)] border border-sand-300 border-s-4 border-s-danger bg-sand-50 p-4">
              <h2 id="failure-title" className="font-bold text-ink-900">
                {t("failed.title")}
              </h2>
              {failedFile ? (
                <span className="mt-1 block break-all font-semibold text-ink-900">
                  <bdi>{failedFile.name}</bdi>
                </span>
              ) : null}
              <p className="mt-0.5 text-ink-900">{t(`failed.reason.${set.failure.reason}`, { page: n(set.failure.filePage) })}</p>
              <p className="mt-1 text-ink-700">{t(`failed.fix.${set.failure.reason}`)}</p>
              <div className="mt-3">
                <RetryAction
                  setId={set.id}
                  reason={set.failure.reason}
                  otherBytes={set.files.filter((f) => f.id !== failedFile?.id).reduce((s, f) => s + f.sizeBytes, 0)}
                />
              </div>
            </section>
          ) : null}

          {unreadableLine ? (
            <p className="flex items-start gap-2 rounded-[var(--radius-field)] bg-gold-100 px-3 py-2.5 text-sm text-ink-900">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-gold-700">
                <AlertIcon className="size-3.5" />
              </span>
              <span>
                {unreadableLine}{" "}
                <a href="#files" className="font-semibold text-sea-700 underline underline-offset-2">
                  {t("unreadable.see")}
                </a>
              </span>
            </p>
          ) : null}

          <StepList states={states} details={details} />

          {/* The price with Cancel at the end of the same row (layout call: cost so far, estimate, Cancel), then what happens to
              the money. Cancel's question opens on its own row. */}
          <div className="flex flex-col gap-1.5 border-t border-sand-200 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <dl className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <dt className="text-ink-700">{t("facts.price")}</dt>
                <dd className="tabular font-semibold text-ink-900">{t(`facts.priceValue.${status}`, { price })}</dd>
              </dl>
              {live ? <CancelProcessing setId={set.id} /> : null}
            </div>
            <p className="text-sm text-ink-700">{t(`facts.note.${status}`)}</p>
            {status === "cancelled" ? (
              <LinkButton href="/patient/records" variant="secondary" className="w-full sm:w-auto sm:self-start">
                {t("cancelled.back")}
              </LinkButton>
            ) : null}
          </div>
        </Surface>

        {status === "cancelled" ? null : <WhatYouGet done={status === "done"} className="lg:col-start-2 lg:row-start-1" />}

        <FilesPages files={set.files} pages={p.pages} locale={loc} className="lg:col-start-1 lg:row-start-2" />
      </div>
    </>
  );
}
