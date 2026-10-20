// One removal request in full (screen 41 detail drawer). Order follows the layout call: the SLA timer (or, once decided, who
// decided what and when), the request as the doctor sent it, the checks it can prove (rule A3: a person decides, with the
// evidence beside them), the matching profile through the one DoctorCard, then Confirm removal, Ask for more information or
// Refuse with reason. A confirmed removal shows the public 410 page (rule U4's "remove me" made good) and its audit entry.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { Badge, Breadcrumbs, CheckIcon, CloseIcon, LinkButton, Notice, Surface, nowrap, type BadgeTone } from "@/components/ui";
import { business } from "@/config/business";
import { formatDate, formatNumber, formatSlotDay, formatTimeInZone, type Locale } from "@/lib/format";
import { profileFor, toRegistryCardData, type RemovalStatus } from "@/lib/sample";
import { RemovalDecision, type DecisionPreview } from "./RemovalDecision";
import { adminName, doctorName, isDecided, publicProfileHref, removalsHref, slaTextColour, tabOf, type QueueRow, type Sla } from "./removals";
import type { T } from "./RemovalQueue";

const sectionTitle = "text-lg font-bold text-sea-900";

export const statusTone: Record<RemovalStatus, BadgeTone> = { open: "info", infoRequested: "pending", confirmed: "success", refused: "pending" };

export async function RemovalDetail({
  row: r,
  locale,
  zone,
  tz,
  preview,
}: {
  row: QueueRow;
  locale: Locale;
  zone: string;
  tz: string | undefined;
  preview?: DecisionPreview;
}) {
  const t = await getTranslations("adminRemovals");
  const tl = await getTranslations("languages");
  const name = doctorName(r, locale);
  const when = (d: Date) => ({ day: formatSlotDay(d, zone, locale), time: formatTimeInZone(d, zone, locale), nowrap });
  const hours = (count: number) => t("units.hours", { count, n: formatNumber(count, locale) });
  const queueHref = removalsHref({ tab: tabOf(r), tz });
  const passed = r.checks.filter((c) => c.passed).length;
  const profile = profileFor(r.doctorId);
  const card = toRegistryCardData(r.doctor, locale, zone, tl);
  const recordName = r.locale === "ar" ? r.doctor.nameAr : r.doctor.nameEn;

  return (
    <article aria-labelledby="removal-title" className="flex min-w-0 flex-col gap-5">
      <header>
        <Breadcrumbs label={t("detail.breadcrumb")} items={[{ label: t("title"), href: queueHref }, { label: name }]} />
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 id="removal-title" className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">
            {name}
          </h1>
          <Badge tone={statusTone[r.status]}>{t(`status.${r.status}`)}</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-700">
          {t.rich("detail.meta", { id: r.id, day: formatSlotDay(r.receivedAt, zone, locale), code: (chunks) => <span className="ltr-run">{chunks}</span> })}
        </p>
      </header>

      {r.decision ? (
        <Notice
          tone={r.status === "confirmed" ? "success" : "info"}
          icon={r.status === "confirmed" ? <CheckIcon className="size-4 text-success" /> : undefined}
          title={t(`detail.decided.${r.status === "confirmed" ? "confirmed" : "refused"}.title`)}
          body={
            <>
              <p>
                {t.rich(`detail.decided.${r.status === "confirmed" ? "confirmed" : "refused"}.body`, {
                  ...when(r.decision.decidedAt),
                  admin: adminName(r.decision.decidedBy, locale),
                  taken: r.sla.kind === "decided" ? hours(r.sla.hoursTaken) : "",
                })}{" "}
                {r.sla.kind === "decided"
                  ? t(r.sla.inTime ? "detail.decided.inTime" : "detail.decided.late", { sla: hours(business.removalSlaHours) })
                  : null}
              </p>
              {r.decision.reason ? (
                <>
                  <p className="mt-2">{t("detail.decided.reasonLead")}</p>
                  <blockquote dir="auto" lang={r.locale} className="mt-1 border-s-4 border-sand-400 ps-3 text-ink-900">
                    {r.decision.reason}
                  </blockquote>
                </>
              ) : null}
            </>
          }
          action={
            r.status === "confirmed" ? (
              <>
                <LinkButton href={publicProfileHref(r)} variant="secondary">
                  {t("detail.seePublic")}
                </LinkButton>
                <LinkButton href="/admin/audit" variant="ghost">
                  {t("detail.auditLog")}
                </LinkButton>
              </>
            ) : (
              <LinkButton href="/admin/audit" variant="ghost">
                {t("detail.auditLog")}
              </LinkButton>
            )
          }
        />
      ) : (
        <Timer sla={r.sla} t={t} locale={locale} zone={zone} hours={hours} />
      )}

      {r.status === "infoRequested" && r.infoRequest ? (
        <Notice
          tone="info"
          title={t("detail.waiting.title")}
          body={
            <>
              <p>{t.rich("detail.waiting.body", { ...when(r.infoRequest.askedAt), admin: adminName(r.infoRequest.askedBy, locale) })}</p>
              <blockquote dir="auto" lang={r.locale} className="mt-2 border-s-4 border-sky-500/50 ps-3 text-ink-900">
                {r.infoRequest.question}
              </blockquote>
            </>
          }
        />
      ) : null}

      <section aria-labelledby="removal-request">
        <Surface>
          <h2 id="removal-request" className={sectionTitle}>
            {t("detail.request.title")}
          </h2>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
            <Fact term={t("detail.request.askedBy")}>
              <bdi className="font-semibold">{r.requesterName}</bdi>
            </Fact>
            <Fact term={t("detail.request.email")}>
              <span className="ltr-run break-all">{r.requesterEmail}</span>
            </Fact>
            <Fact term={t("detail.request.npi")}>
              <span className="ltr-run tabular">{r.npi}</span>
            </Fact>
            <Fact term={t("detail.request.reason")}>{t(`reasons.${r.reason}`)}</Fact>
            <Fact term={t("detail.request.details")}>
              {r.details ? (
                <blockquote dir="auto" lang={r.locale} className="border-s-4 border-sand-300 ps-3">
                  {r.details}
                </blockquote>
              ) : (
                <span className="text-ink-500">{t("detail.request.noDetails")}</span>
              )}
            </Fact>
            <Fact term={t("detail.request.language")}>{t(`languages.${r.locale}`)}</Fact>
            <Fact term={t("detail.request.received")}>
              {/* Day and time on two lines on phone, one from sm up; each part stays whole. */}
              <span className="whitespace-nowrap">{formatSlotDay(r.receivedAt, zone, locale)}</span>
              <span className="hidden sm:inline"> · </span>
              <span className="block whitespace-nowrap sm:inline">{formatTimeInZone(r.receivedAt, zone, locale)}</span>
            </Fact>
          </dl>
        </Surface>
      </section>

      <section aria-labelledby="removal-checks">
        <Surface>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id="removal-checks" className={sectionTitle}>
              {t("detail.checks.title")}
            </h2>
            <p className={["text-sm font-semibold", passed === r.checks.length ? "text-success" : "text-warning"].join(" ")}>
              {t("detail.checks.summary", { passed: formatNumber(passed, locale), total: formatNumber(r.checks.length, locale) })}
            </p>
          </div>
          <p className="mt-1 text-sm text-ink-700">{t("detail.checks.lead")}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {r.checks.map((c) => {
              // The request and the record on two lines, so a name never breaks across them (rule R3).
              const compare = (given: string, record: string, value: (chunks: React.ReactNode) => React.ReactNode) => (
                <>
                  <span className="block">{t.rich("detail.checks.given", { value: given, b: value })}</span>
                  <span className="block">{t.rich("detail.checks.record", { value: record, b: value })}</span>
                </>
              );
              const detail =
                c.key === "npi"
                  ? compare(r.npi, r.doctor.npi, (chunks) => <span className="ltr-run tabular font-semibold text-ink-900">{chunks}</span>)
                  : c.key === "name"
                    ? compare(r.requesterName, recordName, (chunks) => <bdi className="font-semibold text-ink-900">{chunks}</bdi>)
                    : c.key === "email"
                      ? r.emailConfirmedAt
                        ? t.rich("detail.checks.email.passDetail", when(r.emailConfirmedAt))
                        : t("detail.checks.email.failDetail")
                      : c.passed
                        ? null
                        : t("detail.checks.unclaimed.failDetail");
              return (
                <li key={c.key} className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className={[
                      "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full",
                      c.passed ? "bg-[#E4F4EC] text-success" : "bg-gold-100 text-warning",
                    ].join(" ")}
                  >
                    {c.passed ? <CheckIcon className="size-3.5" /> : <CloseIcon className="size-3" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{t(`detail.checks.${c.key}.${c.passed ? "pass" : "fail"}`)}</p>
                    {detail ? <p className="text-sm text-ink-700">{detail}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Surface>
      </section>

      <section aria-labelledby="removal-profile" className="flex flex-col gap-3">
        <h2 id="removal-profile" className={sectionTitle}>
          {t("detail.profile.title")}
        </h2>
        <DoctorCard doctor={card} state={r.doctor.state} size="row" href={publicProfileHref(r)} />
        <div className="flex flex-col gap-0.5 text-sm text-ink-700">
          {r.status === "confirmed" ? <p className="font-semibold text-ink-900">{t("detail.profile.removedNote")}</p> : null}
          {profile?.registryAsOf ? (
            // registryAsOf is a calendar date, not an instant: format it in UTC so no zone moves it a day.
            <p>{t("detail.profile.source", { date: formatDate(new Date(`${profile.registryAsOf}T00:00:00Z`), "UTC", locale) })}</p>
          ) : null}
          {profile?.groupPractice ? <p>{t.rich("detail.profile.practice", { name: profile.groupPractice, b: (chunks) => <bdi>{chunks}</bdi> })}</p> : null}
        </div>
      </section>

      {!isDecided(r.status) ? (
        <RemovalDecision
          id={r.id}
          doctorName={name}
          language={t(`languages.${r.locale}`)}
          checksPassed={passed < r.checks.length ? { passed: formatNumber(passed, locale), total: formatNumber(r.checks.length, locale) } : null}
          publicRemovedHref={`/doctors/${r.doctorId}?state=removed`}
          queueHref={queueHref}
          preview={preview}
        />
      ) : (
        <p className="text-sm text-ink-700">
          <Link href={queueHref} className="font-semibold text-sea-700 underline-offset-2 hover:underline">
            {t("detail.backToQueue")}
          </Link>
        </p>
      )}
    </article>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col sm:contents">
      <dt className="text-sm font-semibold text-ink-700 sm:pt-0.5">{term}</dt>
      <dd className="min-w-0 text-ink-900">{children}</dd>
    </div>
  );
}

/** The SLA timer, large: what is left (or how late it is) against the promise, and the deadline in the admin's zone (rule P6). */
function Timer({ sla, t, locale, zone, hours }: { sla: Sla; t: T; locale: Locale; zone: string; hours: (n: number) => string }) {
  if (sla.kind === "decided") return null;
  const short = (count: number) => t("units.hoursShort", { count, n: formatNumber(count, locale) });
  const at = (d: Date) => ({ day: formatSlotDay(d, zone, locale), time: formatTimeInZone(d, zone, locale), nowrap });
  const title = sla.kind === "overdue" ? "titleOverdue" : sla.kind === "paused" ? "titlePaused" : "title";
  return (
    <section aria-labelledby="removal-timer">
      <Surface>
        <h2 id="removal-timer" className="text-sm font-semibold text-ink-700">
          {t(`detail.timer.${title}`)}
        </h2>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <span className={["tabular text-4xl font-bold leading-tight", slaTextColour(sla)].join(" ")}>
            {sla.kind === "overdue" ? t("detail.timer.late", { value: short(sla.hoursOver) }) : short(sla.hoursLeft)}
          </span>
          {sla.kind !== "overdue" ? <span className="text-ink-700">{t("detail.timer.of", { sla: hours(business.removalSlaHours) })}</span> : null}
        </p>
        <p className="mt-2 text-sm text-ink-700">
          {sla.kind === "paused"
            ? t.rich("detail.timer.pausedSince", at(sla.since))
            : t.rich(sla.kind === "overdue" ? "detail.timer.dueWas" : "detail.timer.dueBy", at(sla.dueAt))}
        </p>
      </Surface>
    </section>
  );
}
