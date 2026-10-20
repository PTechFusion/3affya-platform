// Screen 32, Introduction inbox (docs/screens/32-introduction-inbox.md). Phone first: the heading, the next visit large, then
// the rows grouped as new requests, upcoming and past (each row: first name, date and time in the doctor's zone, status, Join).
// A row opens /professional/inbox/[id], which is the detail drawer: its own page on phone, a pane beside the list on desktop.
// Data: data/sample/introductions.json for the signed-in sample doctor doc_002 (Chicago).
// States: list (default); ?state=empty (one action, rule L3); ?state=loading. Viewer: ?tz= sets the doctor's zone.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, LinkButton } from "@/components/ui";
import type { Locale } from "@/lib/format";
import { groupEntries, inboxEntries, signedInDoctorId, zoneOverride, type SearchParams } from "./_parts/inbox";
import { InboxSections, NextVisit } from "./_parts/InboxList";
import Loading from "./loading";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "inbox" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function InboxPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const loc = locale as Locale;
  const t = await getTranslations("inbox");
  const tz = zoneOverride(sp);
  const entries = sp.state === "empty" ? [] : inboxEntries(signedInDoctorId());
  const groups = groupEntries(entries);
  const next = groups.upcoming[0];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-ink-700">{t("lead")}</p>
      </header>
      {entries.length === 0 ? (
        <EmptyState
          title={t("empty.title")}
          body={t("empty.body")}
          action={<LinkButton href="/professional/availability">{t("empty.action")}</LinkButton>}
        />
      ) : (
        <>
          {next ? <NextVisit entry={next} locale={loc} tz={tz} /> : null}
          <InboxSections groups={groups} locale={loc} tz={tz} />
        </>
      )}
    </div>
  );
}
