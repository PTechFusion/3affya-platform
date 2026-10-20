// Outreach loading state (rule L1): the real heading, the counsel notice, the four funnel tiles with their labels, the tabs,
// the search label and the table's column names, with skeletons where the numbers and rows go. Never "No invites" while
// loading (rule L3). Used by loading.tsx (which cannot read the URL, so no tab shows as current) and by ?state=loading.
import { useTranslations } from "next-intl";
import { DoctorCardSkeleton } from "@/components/brand/DoctorCardSkeleton";
import { Skeleton, Surface, TabLinks } from "@/components/ui";
import type { OutreachTab } from "./outreach";
import { GateNotice, OutreachHeader, Tile } from "./sections";

const TILE_KEYS = ["sent", "opened", "claimed", "expired"] as const;

export function OutreachSkeleton({ tab }: { tab?: OutreachTab }) {
  const t = useTranslations("adminOutreach");
  const columns = ["doctor", "status", "sent"] as const;
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <OutreachHeader />
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TILE_KEYS.map((key) => (
          <li key={key}>
            <Tile label={t(`funnel.${key}`)} value={<Skeleton className="my-1.5 h-7 w-12" />} note={<Skeleton className="mt-1.5 h-4 w-24 max-w-full" />} />
          </li>
        ))}
      </ul>
      <GateNotice />
      <div className="flex flex-col gap-4">
        <TabLinks
          label={t("tabs.label")}
          items={[
            { href: "/admin/outreach", label: t("tabs.sent"), current: tab === "sent" },
            { href: "/admin/outreach?tab=invite", label: t("tabs.invite"), current: tab === "invite" },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <p className="text-[15px] font-semibold text-ink-900">{tab === "invite" ? t("filters.searchInvite") : t("filters.searchSent")}</p>
          <div className="flex gap-2">
            <Skeleton className="h-12 flex-1 rounded-[var(--radius-field)]" />
            <Skeleton className="h-12 w-14 rounded-[var(--radius-field)] sm:w-28" />
          </div>
          <p className="py-3 font-semibold text-ink-900">{t("filters.more")}</p>
        </div>
        {tab === "invite" ? (
          <div className="flex flex-col gap-4">
            <DoctorCardSkeleton size="row" />
            <DoctorCardSkeleton size="row" />
          </div>
        ) : (
          <Surface className="py-2">
            <div className="hidden grid-cols-[32%_1.6fr_1fr] gap-4 border-b border-sand-300 py-3 text-sm font-semibold text-ink-700 lg:grid">
              {columns.map((c) => (
                <span key={c}>{t(`sent.columns.${c}`)}</span>
              ))}
            </div>
            <ul className="divide-y divide-sand-200">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex flex-col gap-2 py-4 lg:grid lg:grid-cols-[32%_1.6fr_1fr] lg:gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-5 w-40 max-w-full" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-48 max-w-full" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-6 w-24 rounded-[var(--radius-tag)]" />
                    <Skeleton className="h-4 w-52 max-w-full" />
                  </div>
                  <Skeleton className="h-4 w-36" />
                </li>
              ))}
            </ul>
          </Surface>
        )}
      </div>
    </div>
  );
}
