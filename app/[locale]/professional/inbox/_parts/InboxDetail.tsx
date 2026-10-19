// One booking or request in full (screen 32 detail). Answers what, when in both zones, how to join, how to change and what the
// patient prepared (rule E2). Order follows the layout call's drawer: both times and the join link, then the shared records
// summary link labelled as AI-generated with its review state (T4), its expiry, who can open it and that the patient can
// withdraw it (T7); then the reason for the visit and what the patient prepared.
import { getTranslations } from "next-intl/server";
import { Badge, Breadcrumbs, CheckIcon, LinkButton, Surface } from "@/components/ui";
import { formatDate, formatSlotDay, formatTime, formatTimeInZone, formatZone, type Locale } from "@/lib/format";
import { InboxActions } from "./InboxActions";
import { nowrap } from "./When";
import { inboxHref, patientName, statusTone, type InboxEntry } from "./inbox";

const sectionTitle = "text-lg font-bold text-sea-900";

export async function InboxDetail({ entry: e, locale, tz }: { entry: InboxEntry; locale: Locale; tz: string | undefined }) {
  const t = await getTranslations("inbox");
  const zone = tz ?? e.doctorTimeZone;
  const name = patientName(e, locale);
  const date = (d: Date) => formatDate(d, zone, locale);
  const concern = locale === "ar" ? e.concernAr : e.concernEn;
  const summary = e.sharedSummary;
  const received = { date: date(e.receivedAt), time: formatTimeInZone(e.receivedAt, zone, locale) };
  const join = e.inbox === "upcoming" ? e.joinUrl : null;
  // The answer goes right under the times when it is the next step (accept a request, mark a past visit done); proposing
  // another time for an upcoming visit is the exception, so it closes the page after the summary and what was prepared.
  const answer = <InboxActions id={e.id} status={e.inbox} />;
  const answerFirst = e.inbox === "request" || e.inbox === "awaitingDone";

  return (
    <article aria-labelledby="visit-title" className="flex min-w-0 flex-col gap-5">
      <header>
        <Breadcrumbs label={t("detail.breadcrumb")} items={[{ label: t("title"), href: inboxHref(undefined, tz) }, { label: name }]} />
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 id="visit-title" className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">
            {name}
          </h1>
          <Badge tone={statusTone[e.inbox]}>{t(`status.${e.inbox}`)}</Badge>
        </div>
        <p className="mt-1 text-ink-700">
          {t(`ageGroup.${e.ageGroup}`)} · {t(`visitType.${e.visitType}`)}
        </p>
        <p className="mt-0.5 text-sm text-ink-500">{t.rich(e.inbox === "request" ? "detail.requested" : "detail.booked", { ...received, nowrap })}</p>
      </header>

      <section aria-labelledby="visit-when">
        <Surface>
          <h2 id="visit-when" className={sectionTitle}>
            {t("detail.whenTitle")}
          </h2>
          {/* Both zones side by side, the doctor's first (rule P6 for the doctor's side; E2: when, in both zones). */}
          <dl className="mt-3 grid grid-cols-2 gap-3">
            {[
              { key: "yourTime", timeZone: zone },
              { key: "patientTime", timeZone: e.patientTimeZone },
            ].map(({ key, timeZone }) => (
              <div key={key} className="min-w-0 rounded-[var(--radius-field)] bg-sand-100 p-3">
                <dt className="text-sm font-semibold text-ink-700">{t(`detail.${key}`)}</dt>
                <dd className="mt-0.5 text-ink-900">{formatSlotDay(e.startsAt, timeZone, locale)}</dd>
                <dd className="flex flex-wrap items-baseline gap-x-2">
                  <span className="tabular text-2xl font-bold text-sea-900">{formatTime(e.startsAt, timeZone, locale)}</span>
                  <span className="ltr-run text-sm text-ink-500">{formatZone(e.startsAt, timeZone)}</span>
                </dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-5 border-t border-sand-200 pt-4 font-semibold text-ink-900">{t("detail.joinTitle")}</h3>
          {join ? (
            <>
              <p className="mt-1 text-sm text-ink-700">{t("detail.joinBody")}</p>
              <p className="mt-1 text-sm">
                <span className="ltr-run break-all text-ink-700">{join}</span>
              </p>
              <LinkButton href={join} target="_blank" rel="noopener noreferrer" size="lg" className="mt-3 w-full sm:w-auto">
                {t(e.visitType === "phone" ? "detail.joinPhoneButton" : "detail.joinButton")}
              </LinkButton>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-700">
              {e.inbox === "request" ? t("detail.joinPending") : t("detail.joinEnded")}
              {e.inbox === "done" && e.doneAt ? ` ${t("detail.doneOn", { date: date(e.doneAt) })}` : null}
            </p>
          )}
        </Surface>
      </section>

      {answerFirst ? answer : null}

      <section aria-labelledby="visit-summary">
        <Surface>
          <h2 id="visit-summary" className={sectionTitle}>
            {t("detail.summaryTitle")}
          </h2>
          {summary ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="info">{t("detail.summaryAi")}</Badge>
                <Badge tone={summary.reviewedAt ? "success" : "pending"}>
                  {summary.reviewedAt ? t("detail.summaryReviewed", { date: date(summary.reviewedAt) }) : t("detail.summaryNotReviewed")}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-ink-700">{t("detail.summaryBody")}</p>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-ink-700">{t("detail.summaryShared", { date: date(summary.sharedAt) })}</span>
                <span className="font-semibold text-ink-900">{t("detail.summaryExpires", { date: date(summary.expiresAt) })}</span>
              </p>
              <p className="mt-1 text-sm text-ink-700">{t("detail.summaryWho")}</p>
              <LinkButton href={`/professional/shared/${summary.id}`} variant="secondary" className="mt-4 w-full sm:w-auto">
                {t("detail.summaryOpen")}
              </LinkButton>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-700">{t("detail.summaryNone")}</p>
          )}
        </Surface>
      </section>

      <section aria-labelledby="visit-reason">
        <Surface>
          <h2 id="visit-reason" className={sectionTitle}>
            {t("detail.reasonTitle")}
          </h2>
          <blockquote className="mt-3 border-s-4 border-lagoon-300 ps-4 text-ink-900">{concern}</blockquote>
          <p className="mt-2 text-sm text-ink-500">{t("detail.reasonSource")}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-ink-500">{t("detail.ageGroup")}</dt>
              <dd className="font-semibold text-ink-900">{t(`ageGroup.${e.ageGroup}`)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{t("detail.bookedBy")}</dt>
              <dd className="font-semibold text-ink-900">{t(`bookedBy.${e.bookedBy}`)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{t("detail.visitType")}</dt>
              <dd className="font-semibold text-ink-900">{t(`visitType.${e.visitType}`)}</dd>
            </div>
          </dl>
        </Surface>
      </section>

      <section aria-labelledby="visit-prepared">
        <Surface>
          <h2 id="visit-prepared" className={sectionTitle}>
            {t("detail.preparedTitle")}
          </h2>
          {e.prepared.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {e.prepared.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-ink-900">
                  <span aria-hidden="true" className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
                    <CheckIcon className="size-3" />
                  </span>
                  {t(`detail.prepared.${item}`)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-ink-700">{t("detail.preparedNone")}</p>
          )}
        </Surface>
      </section>

      {answerFirst ? null : answer}
    </article>
  );
}
