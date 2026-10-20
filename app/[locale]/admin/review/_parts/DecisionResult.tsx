// What a decision leaves behind (screen 38 approved and rejected states): the outcome with who and when, the card patients now
// see (approved, the one DoctorCard) or exactly what the doctor sees in the profile builder (rejected), and the stored checks
// with source, time and reviewer (rule A1). Rendered by the review workspace, for a decision made on the page and for the
// ?state=approved and ?state=rejected previews. Every label arrives formatted (lib/format), so nothing here formats a date.
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DoctorCard, type DoctorCardData } from "@/components/brand/DoctorCard";
import { Badge, LinkButton, Notice, type BadgeTone } from "@/components/ui";
import type { CheckResult, FixKind, ReviewCheckKey } from "./model";

export type DecidedRow = {
  key: ReviewCheckKey;
  result: CheckResult | "eligible";
  sourceLabel?: string;
  stampLabel?: string;
  expiryLabel?: string;
};

export type DecidedView = {
  outcome: "approve" | "reject";
  /** Day, time and zone of the decision in the reviewer's zone. */
  decidedLabel: string;
  /** The date the card shows: Credentials verified on {date}. */
  verifiedOnLabel: string;
  reverifyLabel?: string;
  reverifyBy?: "licence" | "cycle";
  fix?: FixKind;
  reasonEn?: string;
  reasonAr?: string;
  /** The decision date as the doctor's builder shows it (the doctor's own zone). */
  reviewedDateLabel: string;
  rows: DecidedRow[];
};

export const resultTone: Record<DecidedRow["result"], BadgeTone> = { unchecked: "pending", match: "success", mismatch: "danger", eligible: "info" };

/** The builder's rejected banner, word for word (builder.banner.rejected.*), with the reason in the page language. */
export function BuilderPreview({
  fix,
  reasonEn,
  reasonAr,
  dateLabel,
  emptyLabel,
}: {
  fix: FixKind;
  reasonEn: string;
  reasonAr: string;
  dateLabel: string;
  emptyLabel?: string;
}) {
  const tb = useTranslations("builder.banner.rejected");
  const locale = useLocale();
  const ar = locale === "ar" && reasonAr.trim();
  const reason = (ar ? reasonAr : reasonEn).trim();
  return (
    <Notice tone="danger" title={tb(`title.${fix}`)} body={<p className="text-sm">{tb("reviewed", { date: dateLabel })}</p>}>
      {reason ? (
        <blockquote lang={ar ? "ar" : "en"} dir={ar ? "rtl" : "ltr"} className="mt-2 border-s-4 border-danger/60 ps-3 text-start text-ink-900">
          {reason}
        </blockquote>
      ) : (
        <p className="mt-2 border-s-4 border-sand-300 ps-3 text-ink-500">{emptyLabel}</p>
      )}
      <p className="mt-2 text-sm text-ink-700">{tb("after")}</p>
    </Notice>
  );
}

export function DecisionResult({
  view,
  doctorName,
  reviewer,
  card,
  boardCertified,
  next,
  queueHref,
  builderHref,
  headingRef,
}: {
  view: DecidedView;
  doctorName: string;
  reviewer: string;
  card: DoctorCardData;
  boardCertified: boolean;
  next?: { href: string; name: string };
  queueHref: string;
  builderHref?: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const t = useTranslations("adminReview");
  const tCard = useTranslations("card");
  const approved = view.outcome === "approve";
  const nextAction = next ? (
    <LinkButton href={next.href}>{t("result.next", { name: next.name })}</LinkButton>
  ) : (
    <LinkButton href={queueHref}>{t("result.backToQueue")}</LinkButton>
  );

  return (
    <section aria-labelledby="result-title" className="flex flex-col gap-5">
      <Notice
        tone={approved ? "success" : "danger"}
        title={
          <span id="result-title" ref={headingRef} tabIndex={-1} className="outline-none">
            {t(approved ? "result.approved.title" : "result.rejected.title", { name: doctorName })}
          </span>
        }
        titleAs="h2"
        body={
          <>
            <p>{t(approved ? "result.approved.by" : "result.rejected.by", { when: view.decidedLabel, name: reviewer })}</p>
            {approved ? (
              <>
                <p className="mt-1">{t("result.approved.card", { line: tCard("verifiedOn", { date: view.verifiedOnLabel }) })}</p>
                {view.reverifyLabel ? (
                  <p className="mt-1 font-semibold text-ink-900">{t(`result.approved.reverify.${view.reverifyBy ?? "cycle"}`, { date: view.reverifyLabel })}</p>
                ) : null}
                {!boardCertified ? <p className="mt-1">{t("result.approved.eligible")}</p> : null}
              </>
            ) : (
              <p className="mt-1">{t("result.rejected.next", { name: doctorName })}</p>
            )}
            <p className="mt-1 text-sm">{t("result.logged")}</p>
          </>
        }
        action={
          <>
            {nextAction}
            {builderHref ? (
              <Link href={builderHref} className="inline-flex min-h-11 items-center font-semibold text-sea-700 underline-offset-2 hover:underline">
                {t("result.rejected.builderLink")}
              </Link>
            ) : null}
            <Link href="/admin/audit" className="inline-flex min-h-11 items-center font-semibold text-sea-700 underline-offset-2 hover:underline">
              {t("result.audit")}
            </Link>
          </>
        }
      />

      {approved ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink-700">{t("result.approved.cardTitle")}</h3>
          <DoctorCard doctor={{ ...card, verifiedOnLabel: view.verifiedOnLabel, boardCertified }} state="verified" size="mini" side="front" />
        </div>
      ) : view.fix ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink-700">{t("decision.reject.previewTitle", { name: doctorName })}</h3>
          <BuilderPreview fix={view.fix} reasonEn={view.reasonEn ?? ""} reasonAr={view.reasonAr ?? ""} dateLabel={view.reviewedDateLabel} />
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-700">{t("result.checksTitle")}</h3>
        <ul className="divide-y divide-sand-200 rounded-[var(--radius-field)] border border-sand-200 bg-white">
          {view.rows.map((r) => (
            <li key={r.key} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{t(`checks.${r.key}.title`)}</p>
                <p className="text-sm text-ink-700">
                  {[r.sourceLabel, r.expiryLabel ? t("checks.licence.expiresOn", { date: r.expiryLabel }) : undefined].filter(Boolean).join(" · ")}
                </p>
                {r.stampLabel ? <p className="text-sm text-ink-500">{t("checks.stamp", { when: r.stampLabel, name: reviewer })}</p> : null}
              </div>
              <span className="shrink-0">
                <Badge tone={resultTone[r.result]}>{t(`checkResult.${r.result}`)}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
