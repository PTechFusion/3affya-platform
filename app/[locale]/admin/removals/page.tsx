// Screen 41, Removal requests (docs/screens/41-removal-requests.md, task 2.8). The queue of "remove me" requests sent from
// screen 10 (/doctors/[id]/this-is-me), each against the 48-hour promise made to the doctor (business.removalSlaHours, rules A3,
// U4). Layout call: a table with the SLA timer column (amber from removalRules.slaWarnAfterHours, red once missed); a row opens
// the request (/admin/removals/[id]), which is the detail drawer: its own page on phone, a pane beside the list on desktop.
// Data: data/sample/removals.json (rm_001..rm_006). Times render in the admin's zone (sampleAdmin, Riyadh) unless ?tz= is set.
// States: open queue (default; rm_003 is overdue, rm_002 amber, rm_004 waiting on the doctor); ?tab=decided (also
// ?state=decided); ?state=overdue (only the missed ones); ?state=empty (one action); ?state=loading; ?state=error.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, LinkButton, Notice } from "@/components/ui";
import { business, removalRules } from "@/config/business";
import { formatNumber, formatZone, type Locale } from "@/lib/format";
import { RemovalQueue } from "./_parts/RemovalQueue";
import { QueueTabs, RemovalsHeader, RemovalsSkeleton } from "./_parts/RemovalsSkeleton";
import { adminZone, queueFor, removalsHref, tabFrom, zoneParam, type QueueTab, type SearchParams } from "./_parts/removals";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminRemovals" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function RemovalsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const tab = tabFrom(sp);
  if (sp.state === "loading") return <RemovalsSkeleton tab={tab} />;

  const loc = locale as Locale;
  const t = await getTranslations("adminRemovals");
  const tz = zoneParam(sp);
  const zone = adminZone(sp);
  const now = new Date();
  const hours = (count: number) => t("units.hours", { count, n: formatNumber(count, loc) });
  const sla = t("sla", { hours: business.removalSlaHours, count: formatNumber(business.removalSlaHours, loc) });
  const hrefs: Record<QueueTab, string> = { open: removalsHref({ tz }), decided: removalsHref({ tab: "decided", tz }) };
  const header = <RemovalsHeader title={t("title")} lead={t("lead", { sla })} />;

  if (sp.state === "error") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <QueueTabs tab={tab} hrefs={hrefs} />
        <Notice
          tone="danger"
          role="alert"
          title={t("error.title")}
          body={t("error.body")}
          action={<LinkButton href={hrefs[tab]}>{t("error.action")}</LinkButton>}
        />
      </div>
    );
  }

  const queue = queueFor(now);
  // ?state=empty empties the list on screen only, so the empty state's one action still leads somewhere real.
  const empty = sp.state === "empty";
  const open = empty && tab === "open" ? [] : queue.open;
  const decided = empty && tab === "decided" ? [] : queue.decided;
  const overdue = empty && tab === "open" ? [] : queue.overdue;
  const overdueOnly = tab === "open" && sp.state === "overdue" && overdue.length > 0;
  const rows = tab === "decided" ? decided : overdueOnly ? overdue : open;
  const counted = (n: number) => (n ? formatNumber(n, loc) : undefined);

  return (
    <div className="flex flex-col gap-6">
      {header}
      <QueueTabs tab={tab} openCount={counted(open.length)} decidedCount={counted(decided.length)} hrefs={hrefs} />

      {tab === "open" && overdue.length > 0 ? (
        <Notice
          tone="danger"
          title={t("overdue.title", {
            count: overdue.length,
            countLabel: formatNumber(overdue.length, loc),
            slaLabel: formatNumber(business.removalSlaHours, loc),
            sla: hours(business.removalSlaHours),
          })}
          body={overdueOnly ? t("overdue.filtered") : t("overdue.body", { sla })}
          action={
            <LinkButton href={overdueOnly ? hrefs.open : removalsHref({ overdue: true, tz })} variant="secondary">
              {overdueOnly ? t("overdue.showAll") : t("overdue.show")}
            </LinkButton>
          }
        />
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={t(`empty.${tab}.title`)}
          body={t(`empty.${tab}.body`, { sla })}
          action={<LinkButton href={tab === "open" ? hrefs.decided : hrefs.open}>{t(`empty.${tab}.action`)}</LinkButton>}
        />
      ) : (
        <section aria-label={t(`tabs.${tab}`)} className="flex flex-col gap-3">
          <p className="text-sm text-ink-700">
            {t.rich(tab === "open" ? "legend" : "legendDecided", {
              zone: formatZone(now, zone),
              z: (chunks) => <span className="ltr-run">{chunks}</span>,
              warn: hours(removalRules.slaWarnAfterHours),
              sla: hours(business.removalSlaHours),
            })}
          </p>
          <RemovalQueue rows={rows} tab={tab} locale={loc} zone={zone} tz={tz} />
        </section>
      )}
    </div>
  );
}
