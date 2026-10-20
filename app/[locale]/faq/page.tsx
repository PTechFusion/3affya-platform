// Screen 13, FAQ (docs/screens/13-faq.md). Search within the FAQ, then four grouped accordions, last-reviewed date at the bottom.
// States: default; ?q= (search typed, filtered; a query with no match shows the empty state); ?state=empty (no-match state);
// ?state=loading (skeleton); ?open=<id> or ?open=all (answers expanded, e.g. ?open=cannotDo). Viewer via ?country= and ?tz=.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { formatDate, formatMoney, formatNumber, formatTimeInZone, type Locale } from "@/lib/format";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { business } from "@/config/business";
import { FaqBrowser, type FaqSection } from "./FaqBrowser";
import { FaqSkeleton } from "./FaqSkeleton";
import { FAQ_EXAMPLE_SLOT_UTC, FAQ_GROUPS, FAQ_LINKS, FAQ_REVIEWED_ON, type FaqItemId } from "./faq-content";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function FaqPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  if (sp.state === "loading") return <FaqSkeleton />;

  const viewer = viewerFrom(sp);
  const emergency = emergencyNumberFor(viewer.country);
  const query = typeof sp.q === "string" ? sp.q : "";
  const openId = typeof sp.open === "string" ? sp.open : undefined;

  const t = await getTranslations("faq");
  const tc = await getTranslations("common");

  // Every number in the answers comes from config/business.ts or the viewer, formatted with Western digits (rule N1).
  // ICU plurals select on the raw number; the visible digits come from formatNumber.
  const counted = (key: string, n: number) => ({ [key]: n, [`${key}Label`]: formatNumber(n, loc) });
  const values: Partial<Record<FaqItemId, Record<string, string | number>>> = {
    cannotDo: { number: emergency },
    // Non-breaking spaces keep "6:00 PM Riyadh (GMT+3)" on one line, so the mixed-direction run never splits.
    visitTime: { example: formatTimeInZone(new Date(FAQ_EXAMPLE_SLOT_UTC), viewer.timeZone, loc).replace(/ /g, " ") },
    pay: counted("minutes", business.slotHoldMinutes),
    recordsCost: {
      price: formatMoney(business.recordsBlockPriceCents, business.currencyPresentment, loc),
      gb: formatNumber(business.recordsBlockGb, loc),
    },
    sharing: counted("days", business.shareDefaultDays),
    claim: { claim: tc("claimProfile") },
    verification: counted("months", business.verifiedReverifyMonths),
    removal: counted("hours", business.removalSlaHours),
  };

  const sections: FaqSection[] = FAQ_GROUPS.map((g) => ({
    id: g.id,
    title: t(`groups.${g.id}`),
    items: g.items.map((id) => {
      const href = FAQ_LINKS[id];
      return {
        id,
        q: t(`items.${id}.q`),
        a: t(`items.${id}.a`, values[id]),
        href,
        linkLabel: href ? t(`items.${id}.link`) : undefined,
      };
    }),
  }));

  // A calendar date, not an instant: format in UTC so every viewer sees the same day.
  const reviewed = formatDate(new Date(`${FAQ_REVIEWED_ON}T00:00:00Z`), "UTC", loc);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <h1 className="text-3xl font-bold text-sea-900 sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-lg text-ink-700">{t("lead")}</p>
        <FaqBrowser sections={sections} initialQuery={query} openId={openId} forceEmpty={sp.state === "empty"} />
        <p className="mt-8 text-sm text-ink-500">{t("lastReviewed", { date: reviewed })}</p>
      </main>
      <SiteFooter emergencyNumber={emergency} />
    </>
  );
}
