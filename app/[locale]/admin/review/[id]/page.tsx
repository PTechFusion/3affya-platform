// Screen 38 detail: one claim (docs/screens/38-credential-review-queue.md, task 2.8). Phone: the claim alone with a back link to
// the queue. Desktop: the claim with the queue as a column at the start side, the open row marked. Order: the header (who, what
// status, how long it has waited), then the verification checklist above the fold (licence, board, sanctions, photo; rules A1,
// C4), the registry data beside the doctor's entries, and the decision (approve, or reject with a reason the doctor sees).
// Sample claims: doc_009 (new, oldest), doc_010 (registry city differs), doc_011 (board eligible: no board check, rule B7),
// doc_012 (resubmitted after a return). doc_013 is unclaimed and any other id is not in the queue: both show the in-shell
// not-found state. States: ?state=approved (doc_009, doc_010: the decided preview), ?state=rejected (doc_009: the reason the
// builder's rejected state shows), ?state=error (the decision did not save), ?state=loading. ?tz= sets the reviewer's zone.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, Breadcrumbs, EmptyState, LinkButton, Notice, nowrap } from "@/components/ui";
import { business } from "@/config/business";
import { verifiers, reviewVerifiers } from "@/config/verifiers";
import { devRoleSwitchEnabled } from "@/lib/dev-role";
import { formatDate, formatNumber, formatTimeInZone, type Locale } from "@/lib/format";
import { decidedPreviewFor, sampleInstant, toDoctorCardData } from "@/lib/sample";
import { toMb } from "@/app/[locale]/professional/builder/_parts/model";
import type { DecidedRow, DecidedView } from "../_parts/DecisionResult";
import type { ThumbFile } from "../_parts/DocumentThumb";
import { Comparison } from "../_parts/Comparison";
import { QueueList, slaLabel, spanLabel } from "../_parts/QueueList";
import { ClaimSkeleton, QueueHeader } from "../_parts/ReviewSkeleton";
import { ReviewWorkspace, type CheckItemView } from "../_parts/ReviewWorkspace";
import { CHECK_KEYS, blankChecks, boardCheckApplies, fixKindFor, isoDateInZone, reverification, type Checks, type ReviewCheckKey } from "../_parts/model";
import { adminZone, doctorName, nextClaimAfter, reviewHref, reviewQueue, reviewerName, slaTone, spanOf, statusTone, type ClaimFile, type SearchParams } from "../_parts/queue";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminReview" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

const CHECKED_BEFORE_DECISION_MS = 20 * 60_000;

export default async function ClaimPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <ClaimSkeleton />;

  const loc = locale as Locale;
  const t = await getTranslations("adminReview");
  const tl = await getTranslations("languages");
  const now = new Date();
  const zone = adminZone(sp);
  const queue = reviewQueue(now);
  const claim = queue.find((c) => c.doctor.id === id);

  if (!claim) {
    return (
      <div className="flex flex-col gap-6">
        <QueueHeader title={t("title")} />
        <EmptyState
          title={t("notFound.title")}
          body={t("notFound.body")}
          action={<LinkButton href={reviewHref(undefined, sp)}>{t("notFound.action")}</LinkButton>}
        />
      </div>
    );
  }

  const d = claim.doctor;
  const name = doctorName(d, loc);
  const altName = loc === "ar" ? d.nameEn : d.nameAr;
  const reviewer = reviewerName(loc);
  const stamp = (at: Date) => `${formatDate(at, zone, loc)} · ${formatTimeInZone(at, zone, loc)}`;
  const calendar = (iso: string) => formatDate(new Date(`${iso}T00:00:00Z`), "UTC", loc);
  const todayIso = isoDateInZone(now, zone);
  const stateName = claim.licenceState ? (loc === "ar" ? claim.licenceState.ar : claim.licenceState.en) : "";

  /* ---------- what each check shows ---------- */
  const thumb = (f: ClaimFile): ThumbFile => ({
    id: f.id,
    name: f.name,
    kindLabel: t(`fileKind.${f.kind}`),
    sizeLabel: t("viewer.sizeMb", { size: formatNumber(toMb(f.sizeBytes), loc, { maximumFractionDigits: 1 }) }),
    uploadedLabel: stamp(f.uploadedAt),
  });
  const filesOf = (kind: ClaimFile["kind"]) => claim.files.filter((f) => f.kind === kind).map(thumb);
  const docinfo = { href: verifiers.licence.href, label: t("links.docinfo") };
  const items: Record<ReviewCheckKey, CheckItemView> = {
    licence: {
      entry: claim.row.licenceNumber && stateName ? t("checks.licence.entry", { state: stateName, number: claim.row.licenceNumber }) : t("checks.licence.entryMissing"),
      expectsFiles: true,
      files: filesOf("licence"),
      links: [docinfo],
      sourceLabels: { stateBoard: t("sources.stateBoard", { state: stateName }), docinfo: t("sources.docinfo") },
    },
    board: {
      entry: claim.board.status === "eligible" ? t("checks.board.entryEligible") : t("checks.board.entryCertified", { board: claim.board.name ?? "" }),
      expectsFiles: boardCheckApplies(claim.board),
      files: filesOf("board"),
      links: boardCheckApplies(claim.board) ? [{ href: verifiers.board.href, label: t("links.abms") }] : [],
      sourceLabels: { abms: t("sources.abms"), aoa: t("sources.aoa") },
    },
    sanctions: {
      entry: t("checks.sanctions.entry", { npi: d.npi }),
      expectsFiles: false,
      files: [],
      links: [docinfo, { href: reviewVerifiers.npdb.href, label: t("links.npdb") }],
      sourceLabels: { docinfo: t("sources.docinfo"), npdb: t("sources.npdb") },
    },
    photo: {
      entry: t("checks.photo.entry"),
      points: (["coat", "background", "alone", "stock"] as const).map((k) => t(`checks.photo.points.${k}`)),
      expectsFiles: true,
      files: d.photoUrl ? [{ id: `${d.id}-photo`, name: t("checks.photo.fileName"), kindLabel: "", imageUrl: d.photoUrl }] : [],
      links: [],
      sourceLabels: { visual: t("sources.visual"), reverseImage: t("sources.reverseImage") },
    },
  };
  // Other files (a residency letter, say) sit with the board check when the doctor is board eligible, else with the licence.
  const others = filesOf("other");
  if (others.length) items[boardCheckApplies(claim.board) ? "licence" : "board"].files.push(...others);

  /* ---------- the decided previews and the error preview ---------- */
  const state = typeof sp.state === "string" ? sp.state : undefined;
  const preview = decidedPreviewFor(d.id);
  const rejection = !claim.previousReturn ? claim.row.rejection : null;
  const rejectedFile = rejection ? claim.row.files.find((f) => f.id === rejection.fileId) : undefined;
  // The rejected preview is the builder's own row (same reason, same date), so both sides of the decision agree.
  const rejectedAt = rejection && claim.row.decidedAtUtc ? sampleInstant(claim.row.decidedAtUtc) : undefined;
  const previewChecks = (decidedAt: Date, mismatch?: ReviewCheckKey): { checks: Checks; stamps: Partial<Record<ReviewCheckKey, string>> } => {
    const checks = blankChecks();
    const stamps: Partial<Record<ReviewCheckKey, string>> = {};
    const at = new Date(decidedAt.getTime() - CHECKED_BEFORE_DECISION_MS);
    for (const key of CHECK_KEYS) {
      if (key === "board" && !boardCheckApplies(claim.board)) continue;
      checks[key] = {
        result: key === mismatch ? "mismatch" : "match",
        source: preview?.sources[key] ?? checks[key].source,
        checkedAtUtc: at.toISOString(),
        expiresOn: key === "licence" && key !== mismatch ? (preview?.licenceExpiresOn ?? "") : "",
      };
      stamps[key] = stamp(at);
    }
    return { checks, stamps };
  };
  const rowsOf = (checks: Checks, stamps: Partial<Record<ReviewCheckKey, string>>): DecidedRow[] =>
    CHECK_KEYS.map((key) =>
      key === "board" && !boardCheckApplies(claim.board)
        ? { key, result: "eligible" }
        : {
            key,
            result: checks[key].result,
            sourceLabel: items[key].sourceLabels[checks[key].source],
            stampLabel: stamps[key],
            expiryLabel: key === "licence" && checks.licence.expiresOn ? calendar(checks.licence.expiresOn) : undefined,
          },
    );

  let decided: DecidedView | undefined;
  if (state === "approved" && preview) {
    const { checks, stamps } = previewChecks(preview.decidedAt);
    const re = reverification(preview.decidedAt, preview.licenceExpiresOn, business.verifiedReverifyMonths);
    decided = {
      outcome: "approve",
      decidedLabel: stamp(preview.decidedAt),
      verifiedOnLabel: formatDate(preview.decidedAt, zone, loc),
      reverifyLabel: calendar(re.on.toISOString().slice(0, 10)),
      reverifyBy: re.by,
      reviewedDateLabel: formatDate(preview.decidedAt, claim.doctorZone, loc),
      rows: rowsOf(checks, stamps),
    };
  } else if (state === "rejected" && rejection && rejectedAt) {
    const decidedAt = rejectedAt;
    const fix = rejectedFile?.kind ?? "other";
    const mismatch: ReviewCheckKey = fix === "licence" || fix === "board" ? fix : "photo";
    const { checks, stamps } = previewChecks(decidedAt, mismatch);
    decided = {
      outcome: "reject",
      decidedLabel: stamp(decidedAt),
      verifiedOnLabel: formatDate(decidedAt, zone, loc),
      fix: fixKindFor(mismatch),
      reasonEn: rejection.reasonEn,
      reasonAr: rejection.reasonAr,
      reviewedDateLabel: formatDate(decidedAt, claim.doctorZone, loc),
      rows: rowsOf(checks, stamps),
    };
  }
  const errorPreview = !decided && state === "error";
  const prefilled = errorPreview && preview ? previewChecks(now) : undefined;
  const initialReverify = prefilled
    ? reverification(new Date(`${todayIso}T12:00:00Z`), prefilled.checks.licence.expiresOn, business.verifiedReverifyMonths)
    : undefined;

  const next = nextClaimAfter(d.id, now);
  const waited = spanLabel(t, spanOf(now.getTime() - claim.submittedAt.getTime()), loc);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <article aria-labelledby="claim-title" className="flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-start-1">
        <header>
          <Breadcrumbs label={t("breadcrumb")} items={[{ label: t("title"), href: reviewHref(undefined, sp) }, { label: name }]} />
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 id="claim-title" className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">
              {name}
            </h1>
            <span className="flex flex-wrap gap-1.5">
              {decided ? null : <Badge tone={slaTone[claim.sla]}>{slaLabel(t, claim, now, loc)}</Badge>}
              <Badge tone={decided ? (decided.outcome === "approve" ? "verified" : "danger") : statusTone[claim.status]}>
                {decided ? t(`status.${decided.outcome === "approve" ? "approved" : "rejected"}`) : t(`status.${claim.status}`)}
              </Badge>
            </span>
          </div>
          <p className="mt-0.5 text-sm text-ink-500">
            <bdi>{altName}</bdi>
          </p>
          <p className="mt-1 text-ink-700">
            {loc === "ar" ? d.specialtyAr : d.specialtyEn} · {loc === "ar" ? d.cityAr : d.cityEn} ·{" "}
            <span className="whitespace-nowrap">
              {t("npi")} <span className="ltr-run tabular">{d.npi}</span>
            </span>
          </p>
          <p className="mt-0.5 text-sm text-ink-500">
            {t.rich(claim.status === "resubmitted" ? "detail.resubmittedAt" : "detail.submittedAt", {
              date: formatDate(claim.submittedAt, zone, loc),
              time: formatTimeInZone(claim.submittedAt, zone, loc),
              nowrap,
            })}
            {decided ? null : ` · ${t("queue.waiting", { duration: waited })}`}
          </p>
        </header>

        {claim.previousReturn && !decided ? (
          <Notice
            tone="info"
            title={t("detail.previousTitle", { date: formatDate(claim.previousReturn.at, zone, loc) })}
            body={<p className="text-sm">{t("detail.previousBody")}</p>}
          >
            <blockquote lang={loc} className="mt-2 border-s-4 border-sky-500/60 ps-3 text-ink-900">
              {loc === "ar" ? claim.previousReturn.reasonAr : claim.previousReturn.reasonEn}
            </blockquote>
          </Notice>
        ) : null}

        <ReviewWorkspace
          doctorId={d.id}
          doctorName={name}
          reviewer={reviewer}
          zone={zone}
          doctorZone={claim.doctorZone}
          todayIso={todayIso}
          todayLabel={formatDate(now, zone, loc)}
          cycleMonths={business.verifiedReverifyMonths}
          board={claim.board}
          items={items}
          initialChecks={prefilled?.checks ?? blankChecks()}
          initialStamps={prefilled?.stamps ?? {}}
          initialOutcome={errorPreview ? (prefilled ? "approve" : undefined) : undefined}
          initialError={errorPreview ? "unavailable" : undefined}
          initialReverifyLabel={initialReverify ? calendar(initialReverify.on.toISOString().slice(0, 10)) : undefined}
          decided={decided}
          card={toDoctorCardData(d, loc, zone, tl)}
          next={next ? { href: reviewHref(next.doctor.id, sp), name: doctorName(next.doctor, loc) } : undefined}
          queueHref={reviewHref(undefined, sp)}
          builderHref={devRoleSwitchEnabled && decided?.outcome === "reject" ? `/professional/builder?doctor=${d.id}&state=rejected` : undefined}
          comparison={<Comparison claim={claim} locale={loc} />}
        />
      </article>
      <aside aria-label={t("title")} className="hidden lg:col-start-1 lg:row-start-1 lg:block">
        <QueueList claims={queue} locale={loc} zone={zone} sp={sp} now={now} currentId={d.id} compact />
      </aside>
    </div>
  );
}
