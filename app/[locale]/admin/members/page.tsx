// Screen 42, Members and subscriptions (docs/screens/42-members-and-subscriptions.md, tasks 3.5 and 3.11). Every verified
// professional with their plan, status, renewal or grace days left, and a Stripe link per row. The table opens on Active and
// past due, most urgent first; Cancelled, No membership and All are one chip away (rule A5). A row opens the detail sheet
// (?doctor=<id>) with the period, grace, last invoice and the Stripe Dashboard links, and the changes an admin can make: free
// months, extra grace, cancel at period end, resume. Stripe Billing hosts the subscription itself (ADR-6): there is no billing
// UI here, and the membership row changes only when Stripe's webhook confirms. Dates are in the admin's zone (sampleAdmin,
// Riyadh) unless ?tz= is set.
// States: list (default, Active and past due); ?status=cancelled|none|all; ?doctor=doc_004 (sheet; doc_002 is the doctor of
// screen 33, doc_008 has no membership); ?state=empty (the view has no rows, one action); ?state=loading (skeleton, as
// loading.tsx); ?state=error (did not load); ?state=changed (just changed: Dr Huda Aziz set to end at period end, with Undo),
// or after a real change ?changed=<doctor>&did=comp|extendGrace|cancelAtPeriodEnd|resume[&months=n]; ?undone=<doctor>.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, LinkButton, Notice, nowrap } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import { MemberSheet } from "./_parts/MemberSheet";
import { MembersHeader } from "./_parts/MembersHeader";
import { FilterChips, MemberRows, Totals } from "./_parts/MembersList";
import { MembersSkeleton } from "./_parts/MembersSkeleton";
import { baseQuery, filterFrom, membersView, type SearchParams } from "./_parts/members";
import { MEMBERS_FILTERS, membersHref, type MembersFilter } from "./_parts/shared";
import { UndoChange } from "./_parts/UndoChange";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminMembers" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function MembersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const filter = filterFrom(sp);
  const query = baseQuery(sp);
  if (sp.state === "loading") return <MembersSkeleton filter={filter} tz={query.tz} />;

  const loc = locale as Locale;
  const t = await getTranslations("adminMembers");

  if (sp.state === "error") {
    return (
      <div className="flex flex-col gap-6">
        <MembersHeader />
        <Notice
          tone="danger"
          live="alert"
          title={t("error.title")}
          body={<p>{t("error.body")}</p>}
          action={<LinkButton href={membersHref(query)}>{t("error.action")}</LinkButton>}
        />
      </div>
    );
  }

  const tp = await getTranslations("forProfessionals");
  const view = membersView(sp, t, tp, loc);
  const counts = Object.fromEntries(MEMBERS_FILTERS.map((f) => [f, formatNumber(view.counts[f], loc)])) as Record<MembersFilter, string>;
  const notice = view.notice;

  return (
    <div className="flex flex-col gap-6">
      <MembersHeader />

      {notice ? (
        <Notice
          tone={notice.tone}
          live="status"
          title={notice.title}
          body={
            <p>
              {notice.rich ? (
                <>
                  {/* Extra grace is 3affya's own setting, not a Stripe call: the prototype line says nothing was saved. */}
                  {t.rich("changed.extend.body", { time: notice.rich.time, nowrap })} {t("changed.stubSaved")}
                </>
              ) : (
                notice.body
              )}
            </p>
          }
          action={
            notice.undo ? (
              <UndoChange doctorId={notice.undo.doctorId} change={notice.undo.did} undoneHref={membersHref({ ...query, undone: notice.undo.doctorId })} />
            ) : undefined
          }
        />
      ) : null}

      <Totals totals={view.totals} locale={loc} />

      <section aria-labelledby="members-list-title" className="flex flex-col gap-4">
        <h2 id="members-list-title" className="sr-only">
          {t("table.caption")}
        </h2>
        <FilterChips current={filter} counts={counts} query={query} />
        {view.rows.length ? (
          <>
            <MemberRows rows={view.rows} />
            <p className="text-sm text-ink-500">
              {t("zone")} <span className="ltr-run">{view.zone}</span>
            </p>
          </>
        ) : (
          <EmptyState
            title={t(`empty.${filter}.title`)}
            body={t(`empty.${filter}.body`)}
            action={
              filter === "all" ? (
                <LinkButton href="/admin/review">{t("empty.review")}</LinkButton>
              ) : (
                <LinkButton href={membersHref({ ...query, status: "all" })}>{t("empty.showAll")}</LinkButton>
              )
            }
          />
        )}
      </section>

      {view.detail !== undefined ? <MemberSheet key={String(sp.doctor)} detail={view.detail} query={query} /> : null}
    </div>
  );
}
