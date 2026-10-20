// Screen 47, Audit log (docs/screens/47-audit-log.md, task 2.8; rules A1, B10, A5, L3, L4, P6, S5). Phone first: the heading
// with the read-only line, the filters (actor and action up front, target and dates under More filters), the count with
// Export CSV, then the log newest first, grouped by day in the admin's zone. Each row opens to the before and after of every
// field, the verification checks with source, date and reviewer (A1), the note and the ids. No edit controls anywhere: the
// log is append only. Load more adds the next twenty (S5); the end of the log says so.
// Data: data/sample/audit.json through lib/sample auditEntries (48 synthetic entries). Viewer: ?tz= sets the zone, else
// sampleAdmin's (Riyadh). Filters: ?actor= (adm_001, adm_002, professional, patient, sys_*), ?action= (an action or an area:
// verification, listings, money, records, security), ?target=, ?from= and ?to= (YYYY-MM-DD in the zone).
// States: log (default); ?page=2; ?state=end (every entry, end of log); ?open=aud_041 (a row open: the verification rejection
// with its checks, reviewer and reason; aud_021 is the approval, and the page grows to show any linked entry); ?state=empty
// (filters that match nothing, one action, L3); ?state=loading (as loading.tsx); ?state=error (the log did not load); ?from=
// after ?to= (date error, L4); ?export=preview (the export stub's answer shown).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, LinkButton, Notice } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatNumber, formatZone, type Locale } from "@/lib/format";
import { auditEntries } from "@/lib/sample";
import type { AuditExportResult } from "./actions";
import {
  AUDIT_PAGE_SIZE,
  EMPTY_DEMO_FILTERS,
  adminZone,
  appliedCount,
  applyFilters,
  auditHref,
  filtersFrom,
  pageFrom,
  tzOverride,
  type SearchParams,
} from "./_parts/audit";
import { AuditFiltersForm } from "./_parts/AuditFilters";
import { AuditRows } from "./_parts/AuditRows";
import { AuditHeader, AuditSkeleton, ZoneLine } from "./_parts/AuditSkeleton";
import { ExportBar } from "./_parts/ExportBar";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminAudit" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function AuditPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const tz = tzOverride(sp);
  const zone = adminZone(tz);
  if (sp.state === "loading") return <AuditSkeleton zone={zone} />;

  const loc = locale as Locale;
  const t = await getTranslations("adminAudit");
  const tc = await getTranslations("common");

  if (sp.state === "error") {
    return (
      <div className="flex flex-col gap-5">
        <AuditHeader />
        <Notice
          role="alert"
          tone="danger"
          title={t("error.title")}
          body={t("error.body")}
          action={
            <LinkButton href={auditHref(filtersFrom(sp).filters, tz)} variant="secondary">
              {t("error.action")}
            </LinkButton>
          }
        />
      </div>
    );
  }

  const now = new Date();
  const parsed = filtersFrom(sp);
  const { dateError } = parsed;
  const filters = sp.state === "empty" && appliedCount(parsed.filters) === 0 ? EMPTY_DEMO_FILTERS : parsed.filters;
  // A from > to range is not applied (L4: the error says so), so it does not count as a filter either.
  const filtered = appliedCount(dateError ? { ...filters, from: undefined, to: undefined } : filters) > 0;
  const all = auditEntries(now);
  const matching = sp.state === "empty" ? [] : applyFilters(all, filters, zone, dateError);
  const openId = typeof sp.open === "string" ? sp.open : undefined;
  // A link to one entry (?open=) always shows it, however far down the log it is.
  const openIndex = openId ? matching.findIndex((e) => e.id === openId) : -1;
  const page = Math.max(
    sp.state === "end" ? Math.ceil(matching.length / AUDIT_PAGE_SIZE) : pageFrom(sp),
    openIndex >= 0 ? Math.ceil((openIndex + 1) / AUDIT_PAGE_SIZE) : 1,
  );
  const shown = matching.slice(0, page * AUDIT_PAGE_SIZE);
  const atEnd = shown.length >= matching.length;
  const oldest = all.at(-1);
  const clearHref = auditHref({}, tz);

  const exportFields: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...filters, tz })) if (value) exportFields[key] = value;
  const initialExport: AuditExportResult | null = sp.export === "preview" ? { ok: false, error: "preview", rows: matching.length } : null;
  const showingValues = { shown: formatNumber(shown.length, loc), total: matching.length, totalLabel: formatNumber(matching.length, loc) };

  return (
    <div className="flex flex-col gap-5">
      <AuditHeader />
      <AuditFiltersForm filters={filters} dateError={dateError} zoneLabel={formatZone(now, zone)} tz={tz} locale={loc} />

      {matching.length === 0 ? (
        <EmptyState
          title={t("empty.title")}
          body={t("empty.body")}
          action={<LinkButton href={clearHref}>{t("empty.action")}</LinkButton>}
        />
      ) : (
        <>
          <ExportBar fields={exportFields} initial={initialExport}>
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">
                {filtered ? t("results.showingFiltered", showingValues) : t("results.showing", showingValues)}
                {filtered ? (
                  <>
                    <span aria-hidden="true" className="font-normal text-ink-500">
                      {" · "}
                    </span>
                    <Link href={clearHref} className="font-semibold text-sea-700 underline underline-offset-4 hover:text-sea-900">
                      {t("filters.clear")}
                    </Link>
                  </>
                ) : null}
              </p>
              <ZoneLine zone={zone} locale={loc} />
            </div>
          </ExportBar>

          <AuditRows entries={shown} locale={loc} zone={zone} openId={openId} now={now} />

          {atEnd ? (
            <div className="flex flex-col items-center gap-1 border-t border-dashed border-sand-300 pt-4 text-center">
              <p className="font-semibold text-ink-900">{t("results.endTitle")}</p>
              <p className="text-sm text-ink-700">
                {filtered || !oldest ? t("results.endFiltered") : t("results.endBody", { date: formatDate(oldest.at, zone, loc) })}
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <LinkButton href={auditHref(filters, tz, { page: page + 1 })} scroll={false} variant="secondary">
                {tc("loadMore")}
              </LinkButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}
