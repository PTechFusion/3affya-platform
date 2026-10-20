// The review queue rows (screen 38), oldest submission first: the doctor, what was submitted, when (reviewer's zone, zone
// named), how long it has waited, its status and its SLA badge. The whole row opens the claim through one stretched link, so
// nothing interactive is nested. `compact` is the column beside an open claim on desktop, with the open row marked.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, ChevronNext, Surface, nowrap } from "@/components/ui";
import { formatDate, formatNumber, formatTimeInZone, type Locale } from "@/lib/format";
import { doctorName, reviewHref, slaTone, spanOf, statusTone, type Claim, type SearchParams, type Span } from "./queue";

type T = Awaited<ReturnType<typeof getTranslations>>;

/** "3 days", "20 hours", "under an hour", with Western digits (rule N1). */
export function spanLabel(t: T, span: Span, locale: Locale): string {
  return span.unit === "underHour" ? t("duration.underHour") : t(`duration.${span.unit}`, { count: span.count, countLabel: formatNumber(span.count, locale) });
}

export function slaLabel(t: T, claim: Claim, now: Date, locale: Locale): string {
  return t(`sla.${claim.sla}`, { duration: spanLabel(t, spanOf(claim.dueAt.getTime() - now.getTime(), "left"), locale) });
}

export async function QueueList({
  claims,
  locale,
  zone,
  sp,
  now,
  currentId,
  compact = false,
}: {
  claims: Claim[];
  locale: Locale;
  zone: string;
  sp: SearchParams;
  now: Date;
  currentId?: string;
  compact?: boolean;
}) {
  const t = await getTranslations("adminReview");
  return (
    <Surface className={compact ? "p-3" : undefined}>
      <ol className={["@container divide-y divide-sand-200", compact ? "" : "-my-3"].join(" ")}>
        {claims.map((c) => {
          const name = doctorName(c.doctor, locale);
          const current = c.doctor.id === currentId;
          const waited = spanLabel(t, spanOf(now.getTime() - c.submittedAt.getTime()), locale);
          const state = c.licenceState ? (locale === "ar" ? c.licenceState.ar : c.licenceState.en) : null;
          return (
            <li
              key={c.doctor.id}
              className={[
                // Narrow: one column, the badges straight under the name. Wide: doctor, submitted, waiting, badges in one row.
                "relative grid grid-cols-1 gap-x-4 gap-y-1.5 py-3",
                compact ? "" : "@2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_auto_auto] @2xl:items-center",
                current ? "-mx-1 rounded-[var(--radius-field)] bg-sea-100 px-2" : "",
              ].join(" ")}
            >
              <div className="min-w-0">
                <Link
                  href={reviewHref(c.doctor.id, sp)}
                  aria-current={current ? "page" : undefined}
                  className="font-semibold text-sea-900 underline-offset-2 after:absolute after:inset-0 after:rounded-[var(--radius-field)] hover:underline"
                >
                  {name}
                </Link>
                <p className="text-sm text-ink-700">
                  {locale === "ar" ? c.doctor.specialtyAr : c.doctor.specialtyEn}
                  {!compact && state ? ` · ${t("queue.licenceIn", { state })}` : null}
                </p>
              </div>
              <div className={["flex flex-wrap items-center gap-1.5", compact ? "" : "@2xl:col-start-4 @2xl:row-start-1 @2xl:flex-nowrap @2xl:justify-end"].join(" ")}>
                <Badge tone={slaTone[c.sla]}>{slaLabel(t, c, now, locale)}</Badge>
                {compact ? null : <Badge tone={statusTone[c.status]}>{t(`status.${c.status}`)}</Badge>}
                {compact ? null : <ChevronNext className="hidden size-4 shrink-0 text-sea-700 @2xl:block" />}
              </div>
              {compact ? null : (
                <p className="text-sm text-ink-700 @2xl:col-start-2 @2xl:row-start-1">
                  {t.rich(c.status === "resubmitted" ? "detail.resubmittedAt" : "detail.submittedAt", {
                    date: formatDate(c.submittedAt, zone, locale),
                    time: formatTimeInZone(c.submittedAt, zone, locale),
                    nowrap,
                  })}
                </p>
              )}
              <p className={["text-sm text-ink-700", compact ? "" : "@2xl:col-start-3 @2xl:row-start-1"].join(" ")}>{t("queue.waiting", { duration: waited })}</p>
            </li>
          );
        })}
      </ol>
    </Surface>
  );
}
