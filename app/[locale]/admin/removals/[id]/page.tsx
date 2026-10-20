// Screen 41 detail: one removal request, the layout call's drawer as a real URL. Phone: the request alone, with a back link to
// the queue. Desktop: the detail at the end side with the queue beside it at the start, the open row marked.
// Sample ids (data/sample/removals.json): rm_001 open with every check passed, rm_002 amber (over 36 hours old), rm_003 overdue,
// rm_004 waiting on the doctor (timer paused; name spelled differently, email not confirmed), rm_005 confirmed (listing removed,
// 410), rm_006 refused (someone other than the doctor asked). Any other id shows the not-in-the-queue state inside the shell.
// Previews of the decision step (open requests only): ?state=confirmed, ?state=refused and ?state=asked show the result right
// after the decision; ?state=error shows the confirm step after a failed attempt; ?state=loading the skeleton. ?tz= as on the list.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, LinkButton } from "@/components/ui";
import type { Locale } from "@/lib/format";
import { RemovalDetail } from "../_parts/RemovalDetail";
import { RemovalQueue } from "../_parts/RemovalQueue";
import type { DecisionPreview } from "../_parts/RemovalDecision";
import { adminZone, queueFor, removalsHref, tabOf, zoneParam, type SearchParams } from "../_parts/removals";
import Loading from "./loading";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<SearchParams> };

const PREVIEWS: Record<string, DecisionPreview> = {
  confirmed: { mode: "confirm", done: true },
  refused: { mode: "refuse", done: true },
  asked: { mode: "askInfo", done: true },
  error: { mode: "confirm", failure: "unavailable" },
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminRemovals" });
  return { title: t("detail.metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function RemovalRequestPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const loc = locale as Locale;
  const t = await getTranslations("adminRemovals");
  const tz = zoneParam(sp);
  const zone = adminZone(sp);
  const queue = queueFor(new Date());
  const row = [...queue.open, ...queue.decided].find((r) => r.id === id);

  if (!row) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <EmptyState
          title={t("detail.notFound.title")}
          body={t("detail.notFound.body")}
          action={<LinkButton href={removalsHref({ tz })}>{t("detail.notFound.action")}</LinkButton>}
        />
      </div>
    );
  }

  const tab = tabOf(row);
  const preview = typeof sp.state === "string" ? PREVIEWS[sp.state] : undefined;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="lg:col-start-2 lg:row-start-1">
        <RemovalDetail row={row} locale={loc} zone={zone} tz={tz} preview={preview} />
      </div>
      <aside aria-labelledby="removal-queue-title" className="hidden lg:col-start-1 lg:row-start-1 lg:block">
        <h2 id="removal-queue-title" className="mb-3 text-sm font-semibold text-ink-700">
          {t(`tabs.${tab}`)}
        </h2>
        <RemovalQueue rows={queue[tab]} tab={tab} locale={loc} zone={zone} tz={tz} currentId={row.id} />
      </aside>
    </div>
  );
}
