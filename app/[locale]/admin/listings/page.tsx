// Screen 39, Listings (docs/screens/39-listings.md, task 2.8). Phone first: the heading, the status chips with counts (rules
// S10, S12), search by name or NPI and the specialty filter, then the table: name with NPI and status, specialty, city,
// verified on and next re-verification (rule A2), one action per row. A row opens the edit drawer (?edit=<id>): what the status
// means, what patients see (the one DoctorCard, rule U1), the details, the edit form, then suspend or unsuspend (rules A5, B10).
// Data: every doctor row (data/sample/doctors.json) through sampleListings in lib/sample.ts; admin facts in listings.json.
// States: table (default); ?status=unclaimed|claimed|inReview|verified|rejected|suspended|removed; ?specialty=&q= (name or
// NPI); ?state=empty (the zero result of Rejected + Cardiology, one action); ?state=loading; ?state=error; ?state=suspended
// (just suspended Dr Karim Saleh, with Undo); ?edit=doc_002 (drawer: verified), doc_007 (re-verification due), doc_011 (in
// review), doc_009 (rejected), doc_010 (claimed), doc_013 (unclaimed), doc_391 (suspended); ?edit=doc_004&confirm=suspend (the
// suspend question); ?per=8 (Load more with the sample rows). Viewer: ?tz= sets the admin zone (default sampleAdmin, Riyadh).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, LinkButton, Notice, type BadgeTone, type NoticeTone } from "@/components/ui";
import { formatDate, formatNumber, formatTimeInZone, formatZone, type Locale } from "@/lib/format";
import { sampleSpecialties, toDoctorCardData, toRegistryCardData, type SampleListing } from "@/lib/sample";
import { ListingDrawer } from "./_parts/ListingDrawer";
import { ListingsFilters, type AppliedChip, type StatusChip } from "./_parts/ListingsFilters";
import { ListingsHeader, ListingsSkeleton } from "./_parts/ListingsSkeleton";
import { ListingsTable, type RowView } from "./_parts/ListingsTable";
import { ListingsToast } from "./_parts/ListingsToast";
import {
  adminZone,
  byName,
  filterListings,
  listingsHref,
  nextReverification,
  PAGE_SIZE,
  parseQuery,
  specialtyCounts,
  statusCounts,
  statusFilters,
  statusTone,
  withChange,
  type Reverification,
  type SearchParams,
} from "./_parts/listings";
import type { DrawerView, ToastView } from "./_parts/types";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminListings" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function ListingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <ListingsSkeleton />;

  const loc = locale as Locale;
  const t = await getTranslations("adminListings");
  const tc = await getTranslations("common");
  const tl = await getTranslations("languages");
  const query = parseQuery(sp);
  const zone = adminZone(query);
  const now = new Date();
  const header = <ListingsHeader title={t("title")} lead={t("lead")} />;

  if (sp.state === "error") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Notice
          tone="danger"
          title={t("error.title")}
          body={t("error.body")}
          action={<LinkButton href={listingsHref(query)}>{t("error.action")}</LinkButton>}
        />
      </div>
    );
  }

  // ---- Formatting: calendar dates in UTC (they are days, not instants); instants in the admin's zone, zone named ----
  // No-break spaces keep a date on one line when a status line wraps ("1 Oct" / "2026" read as two facts).
  const day = (d: Date) => formatDate(d, "UTC", loc).replace(/ /g, " ");
  const onDay = (d: Date) => formatDate(d, zone, loc).replace(/ /g, " ");
  const at = (d: Date) => `${formatDate(d, zone, loc)} · ${formatTimeInZone(d, zone, loc)}`;
  const count = (n: number) => formatNumber(n, loc);
  const name = (l: SampleListing) => (loc === "ar" ? l.doctor.nameAr : l.doctor.nameEn);
  const specialtyName = (slug: string) => {
    const s = sampleSpecialties.find((x) => x.slug === slug);
    return s ? (loc === "ar" ? s.nameAr : s.nameEn) : slug;
  };
  const sourceLabel = (l: SampleListing) => (l.registry ? t(`source.${l.registry.source}`) : "");

  // ---- Data: every listing with the last action laid over it, then the filters ----
  const { listings, change } = withChange(sp, now);
  const rows = filterListings(listings, query).sort(byName(loc));
  const visible = rows.slice(0, query.shown);
  const changeParams = changeParamsFrom(sp, change?.id);
  const listParams = new URLSearchParams(listingsHref(query, {}, changeParams).split("?")[1] ?? "").toString();
  const editHref = (id: string) => listingsHref(query, {}, { ...changeParams, edit: id });

  const statusLine = (l: SampleListing): string | null => {
    switch (l.status) {
      case "unclaimed":
        return l.registry ? t("line.unclaimed", { source: sourceLabel(l), date: day(l.registry.asOf) }) : null;
      case "claimed":
        return l.claimedAt ? t("line.claimed", { date: onDay(l.claimedAt) }) : t("line.claimedNoDate");
      case "inReview":
        return l.submittedAt ? t("line.inReview", { date: onDay(l.submittedAt) }) : null;
      case "rejected":
        return l.decidedAt ? t("line.rejected", { date: onDay(l.decidedAt) }) : null;
      case "suspended":
        return l.suspension ? t("line.suspended", { date: onDay(l.suspension.at) }) : null;
      case "removed":
        return l.removedAt ? t("line.removed", { date: onDay(l.removedAt) }) : null;
      case "verified":
        return null;
    }
  };
  const dueBadge = (r: Reverification): { label: string; tone: BadgeTone } | null => {
    if (r.due === "ok") return null;
    if (r.due === "overdue") return { label: t("table.overdue", { days: -r.days, daysLabel: count(-r.days) }), tone: "danger" };
    return { label: r.days === 0 ? t("table.dueToday") : t("table.dueSoon", { days: r.days, daysLabel: count(r.days) }), tone: "warning" };
  };
  const reviewHref = (l: SampleListing) => (l.status === "inReview" || l.status === "rejected" ? `/admin/review/${l.doctor.id}` : null);
  const profileHref = (l: SampleListing) =>
    l.status === "suspended" ? null : l.status === "removed" ? `/doctors/${l.doctor.id}?state=removed` : `/doctors/${l.doctor.id}`;

  const rowViews: RowView[] = visible.map((l) => {
    const rev = nextReverification(l, now);
    const review = reviewHref(l);
    const profile = profileHref(l);
    const n = name(l);
    return {
      id: l.doctor.id,
      name: n,
      altName: loc === "ar" ? l.doctor.nameEn : l.doctor.nameAr,
      altLang: loc === "ar" ? "en" : "ar",
      npi: l.doctor.npi,
      statusLabel: t(`status.${l.status}`),
      statusTone: statusTone[l.status],
      line: statusLine(l),
      specialty: specialtyName(l.doctor.specialty),
      city: loc === "ar" ? l.doctor.cityAr : l.doctor.cityEn,
      verifiedOn: l.verifiedOn ? day(l.verifiedOn) : null,
      next: rev ? { date: day(rev.on), basis: t(`table.basis.${rev.basis}`), due: dueBadge(rev) } : null,
      editHref: editHref(l.doctor.id),
      action: review
        ? { href: review, label: t("table.openReview"), ariaLabel: t("table.openReviewLabel", { name: n }) }
        : profile
          ? { href: profile, label: tc("viewProfile"), ariaLabel: t("table.viewProfileLabel", { name: n }) }
          : null,
    };
  });

  // ---- Filters: status chips with counts, the specialty list with counts, applied chips ----
  const sCounts = statusCounts(listings, query);
  const statusChips: StatusChip[] = statusFilters.map((s) => ({
    key: s,
    label: t(`status.${s}`),
    count: count(sCounts[s]),
    href: listingsHref(query, { status: s, shown: query.per }),
    current: query.status === s,
  }));
  const specCounts = specialtyCounts(listings, query);
  const collator = new Intl.Collator(loc, { sensitivity: "base" });
  const filterSpecialties = [...specCounts.entries()]
    .map(([slug, n]) => ({ value: slug, label: t("filters.option", { name: specialtyName(slug), countLabel: count(n) }), sortKey: specialtyName(slug) }))
    .sort((a, b) => collator.compare(a.sortKey, b.sortKey))
    .map(({ value, label }) => ({ value, label }));
  const applied: AppliedChip[] = [
    ...(query.q
      ? [{ key: "q", label: t("filters.query", { query: query.q }), href: listingsHref(query, { q: "", shown: query.per }) }]
      : []),
    ...(query.specialty
      ? [{ key: "specialty", label: specialtyName(query.specialty), href: listingsHref(query, { specialty: null, shown: query.per }) }]
      : []),
  ].map((c) => ({ ...c, removeLabel: t("filters.remove", { label: c.label }) }));
  const cleared = listingsHref(query, { status: "all", specialty: null, q: "", shown: query.per });
  const hidden: Record<string, string> = {};
  if (query.status !== "all") hidden.status = query.status;
  if (query.tz) hidden.tz = query.tz;
  if (query.per !== PAGE_SIZE) hidden.per = String(query.per);

  // ---- The drawer, opened from the URL ----
  const editing = listings.find((l) => l.doctor.id === str(sp.edit));
  const drawer = editing ? drawerView(editing) : null;

  function drawerView(l: SampleListing): DrawerView {
    const n = name(l);
    const rev = nextReverification(l, now);
    const review = reviewHref(l);
    const d = l.doctor;
    const details: DrawerView["details"] = [
      { term: t("drawer.npi"), value: d.npi, ltr: true },
      { term: t("drawer.specialty"), value: specialtyName(d.specialty) },
      { term: t("drawer.city"), value: loc === "ar" ? d.cityAr : d.cityEn },
    ];
    if (l.registry) details.push({ term: t("drawer.source"), value: t("drawer.sourceValue", { source: sourceLabel(l), date: day(l.registry.asOf) }) });
    if (l.claimedAt) details.push({ term: t("drawer.claimedOn"), value: at(l.claimedAt) });
    if (l.submittedAt) details.push({ term: t("drawer.sentOn"), value: at(l.submittedAt) });
    if (l.decidedAt) details.push({ term: t("drawer.decidedOn"), value: at(l.decidedAt) });
    if (l.verifiedOn) details.push({ term: t("drawer.verifiedOn"), value: day(l.verifiedOn) });
    if (rev) details.push({ term: t("drawer.nextCheck"), value: t("drawer.nextCheckValue", { date: day(rev.on), basis: t(`table.basis.${rev.basis}`) }) });
    if (l.licenceExpiresOn && l.licenceStateEn) {
      const state = loc === "ar" ? (l.licenceStateAr ?? l.licenceStateEn) : l.licenceStateEn;
      details.push({ term: t("drawer.licence"), value: t("drawer.licenceValue", { state, date: day(l.licenceExpiresOn) }) });
    }
    if (l.board) details.push({ term: t("drawer.board"), value: l.board });

    let notice: DrawerView["notice"] = null;
    const reviewAction = review ? { href: review, label: t("table.openReview") } : undefined;
    if (l.status === "unclaimed") notice = { tone: "info", title: t("drawer.notice.unclaimedTitle"), lines: [t("drawer.notice.unclaimedBody")] };
    else if (l.status === "claimed") notice = { tone: "info", title: t("drawer.notice.claimedTitle"), lines: [t("drawer.notice.claimedBody")] };
    else if (l.status === "inReview" && l.submittedAt)
      notice = { tone: "warning", title: t("drawer.notice.inReviewTitle", { date: onDay(l.submittedAt) }), lines: [t("drawer.notice.inReviewBody")], action: reviewAction };
    else if (l.status === "rejected" && l.decidedAt)
      notice = {
        tone: "info",
        title: t("drawer.notice.rejectedTitle", { date: onDay(l.decidedAt) }),
        lines: l.rejection ? [t("drawer.notice.rejectedBody", { reason: loc === "ar" ? l.rejection.reasonAr : l.rejection.reasonEn })] : [],
        action: reviewAction,
      };
    else if (l.status === "suspended" && l.suspension) {
      const reason = loc === "ar" ? l.suspension.reasonAr : l.suspension.reasonEn;
      notice = {
        tone: "warning",
        title: t("drawer.notice.suspendedTitle", { date: at(l.suspension.at), name: loc === "ar" ? l.suspension.byAr : l.suspension.byEn }),
        lines: [...(reason ? [t("drawer.notice.suspendedReason", { reason })] : []), t("drawer.notice.suspendedBody")],
      };
    } else if (l.status === "removed" && l.removedAt) notice = { tone: "info", title: t("line.removed", { date: onDay(l.removedAt) }), lines: [] };
    else if (l.status === "verified" && rev && rev.due !== "ok") {
      const tone: NoticeTone = rev.due === "overdue" ? "danger" : "warning";
      const title =
        rev.due === "overdue"
          ? t("drawer.notice.overdueTitle", { days: -rev.days, daysLabel: count(-rev.days) })
          : rev.days === 0
            ? t("drawer.notice.dueTodayTitle")
            : t("drawer.notice.dueSoonTitle", { days: rev.days, daysLabel: count(rev.days) });
      notice = { tone, title, lines: [t("drawer.notice.dueBody", { basis: t(`table.basis.${rev.basis}`), date: day(rev.on) })] };
    }

    const card =
      l.status === "verified"
        ? { data: toDoctorCardData(d, loc, zone, tl), state: "verified" as const }
        : l.status === "unclaimed"
          ? { data: toRegistryCardData(d, loc, zone, tl), state: "unclaimed" as const }
          : l.status === "claimed" || l.status === "inReview" || l.status === "rejected"
            ? { data: toRegistryCardData(d, loc, zone, tl), state: "pending" as const }
            : null;

    return {
      id: d.id,
      name: n,
      status: l.status,
      statusLabel: t(`status.${l.status}`),
      statusTone: statusTone[l.status],
      notice,
      card,
      noCard: l.status === "suspended" ? t("drawer.previewHidden") : l.status === "removed" ? t("drawer.previewRemoved") : null,
      profileHref: profileHref(l),
      details,
      editable: l.status !== "removed",
      nameAr: d.nameAr,
      specialty: d.specialty,
      canSuspend: l.status === "verified",
      canUnsuspend: l.status === "suspended",
    };
  }

  const editSpecialties = [...sampleSpecialties]
    .sort((a, b) => collator.compare(loc === "ar" ? a.nameAr : a.nameEn, loc === "ar" ? b.nameAr : b.nameEn))
    .map((s) => ({ value: s.slug, label: loc === "ar" ? `${s.nameAr} (${s.nameEn})` : `${s.nameEn} (${s.nameAr})` }));

  // ---- The Undo bar for the last action ----
  const changed = change ? listings.find((l) => l.doctor.id === change.id) : undefined;
  const toast: ToastView | null = change && changed ? { kind: change.kind, id: change.id, message: t(`toast.${change.kind}`, { name: name(changed) }) } : null;
  const undoneHref = change ? listingsHref(query, {}, { undone: change.id }) : null;

  // ---- The empty result: what is applied, and the one way out ----
  const appliedSummary = [
    ...(query.status !== "all" ? [t(`status.${query.status}`)] : []),
    ...(query.specialty ? [specialtyName(query.specialty)] : []),
    ...(query.q ? [t("filters.query", { query: query.q })] : []),
  ].join(loc === "ar" ? "، " : ", ");

  return (
    <div className="flex flex-col gap-6">
      {header}

      <ListingsFilters
        action={`/${locale}/admin/listings`}
        labels={{
          status: t("status.label"),
          form: t("filters.label"),
          search: t("filters.search"),
          specialty: t("filters.specialty"),
          allSpecialties: t("filters.allSpecialties"),
          submit: t("filters.submit"),
          applied: t("filters.applied"),
          clearAll: tc("clearAll"),
        }}
        statusChips={statusChips}
        hidden={hidden}
        q={query.q}
        specialty={query.specialty}
        specialtyOptions={filterSpecialties}
        applied={applied}
        clearAll={cleared}
      />

      {rows.length ? (
        <section aria-labelledby="listings-count" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="listings-count" className="font-bold text-sea-900">
              {t("count", { count: rows.length, countLabel: count(rows.length) })}
            </h2>
            <p className="text-sm text-ink-500">
              {t.rich("zone", { name: formatZone(now, zone), zone: (chunks) => <span className="ltr-run">{chunks}</span> })}
            </p>
          </div>
          <ListingsTable
            rows={rowViews}
            labels={{
              caption: t("table.caption"),
              name: t("table.name"),
              specialty: t("table.specialty"),
              city: t("table.city"),
              verifiedOn: t("table.verifiedOn"),
              nextCheck: t("table.nextCheck"),
              actions: t("table.actions"),
              npi: t("table.npi"),
              notVerified: t("table.notVerified"),
              noneScheduled: t("table.noneScheduled"),
              editLabel: t("table.editLabel"),
            }}
          />
          {/* Rule S5: Load more, not pages; the count rides in the URL (?shown=) so Back restores the list. */}
          {visible.length < rows.length ? (
            <div className="mt-3 flex flex-col items-center gap-3">
              <p className="text-sm text-ink-700">{t("showing", { shown: count(visible.length), total: count(rows.length) })}</p>
              <LinkButton
                href={listingsHref(query, { shown: query.shown + query.per }, changeParams)}
                scroll={false}
                variant="secondary"
                className="w-full sm:w-auto sm:min-w-56"
              >
                {tc("loadMore")}
              </LinkButton>
            </div>
          ) : null}
        </section>
      ) : (
        <EmptyState
          title={t("empty.title")}
          body={t("empty.body", { filters: appliedSummary, totalLabel: count(listings.length) })}
          action={<LinkButton href={cleared}>{t("empty.action")}</LinkButton>}
        />
      )}

      {drawer ? (
        <ListingDrawer
          key={drawer.id}
          view={drawer}
          closeHref={listingsHref(query, {}, changeParams)}
          listParams={listParams}
          change={change && change.id === drawer.id ? change : null}
          confirmOnLoad={sp.confirm === "suspend"}
          specialtyOptions={editSpecialties}
        />
      ) : null}

      <ListingsToast key={change ? `${change.kind}-${change.id}` : "none"} toast={drawer ? null : toast} undoneHref={undoneHref} />
    </div>
  );
}

/** The change markers to keep on links while the list shows a change (opening a row, Load more), so the row stays as shown. */
function changeParamsFrom(sp: SearchParams, id: string | undefined): Record<string, string> {
  if (!id) return {};
  const keep: Record<string, string> = {};
  for (const key of ["suspended", "unsuspended", "saved", "savedNameAr", "savedSpecialty", "undone"] as const) {
    const v = sp[key];
    if (typeof v === "string") keep[key] = v;
  }
  if (sp.state === "suspended" && !keep.suspended) keep.suspended = id;
  return keep;
}
