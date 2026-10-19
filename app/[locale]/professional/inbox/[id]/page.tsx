// Screen 32 detail: one booking or introduction request. Phone: the detail alone, with a back link to the inbox. Desktop: the
// detail pane at the end side with the list beside it at the start, the open row marked, so the layout call's drawer is a
// real URL that Back and links can reach. Sample ids (data/sample/introductions.json): int_001 upcoming, int_002 upcoming with
// a shared summary not yet reviewed, int_003 new request, int_004 past and not marked done with a reviewed summary, int_005
// done. Any other id, or another professional's row, shows the not-in-your-inbox state. ?state=loading; ?tz= as on the list.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, LinkButton } from "@/components/ui";
import type { Locale } from "@/lib/format";
import { groupEntries, inboxEntries, inboxHref, signedInDoctorId, zoneOverride, type SearchParams } from "../_parts/inbox";
import { InboxSections } from "../_parts/InboxList";
import { InboxDetail } from "../_parts/InboxDetail";
import Loading from "./loading";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "inbox" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function InboxItemPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const loc = locale as Locale;
  const t = await getTranslations("inbox");
  const tz = zoneOverride(sp);
  // Only the signed-in professional's own rows resolve (authorisation is server-side; task 3.3 moves it into RLS).
  const entries = inboxEntries(signedInDoctorId());
  const entry = entries.find((e) => e.id === id);

  if (!entry) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <EmptyState
          title={t("detail.notFound.title")}
          body={t("detail.notFound.body")}
          action={<LinkButton href={inboxHref(undefined, tz)}>{t("detail.notFound.action")}</LinkButton>}
        />
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="lg:col-start-2 lg:row-start-1">
        <InboxDetail entry={entry} locale={loc} tz={tz} />
      </div>
      <aside aria-label={t("title")} className="hidden lg:col-start-1 lg:row-start-1 lg:block">
        <InboxSections groups={groupEntries(entries)} locale={loc} tz={tz} currentId={entry.id} />
      </aside>
    </div>
  );
}
