// Screen 23, Receipts (docs/screens/23-receipts.md, task 3.6; rules E3, P14, P15, C5). Phone first: the heading, then the list
// above the fold, one row per payment (date paid, doctor, all-in total, status). A row opens /patient/receipts/[id], the
// itemised receipt. Stripe hosts the downloadable receipt (ADR 6); this page lists and summarises.
// Data: data/sample/receipts.json joined to data/sample/bookings.json, the signed-in sample patient's (lib/sample patientReceipts).
// States: list (default); ?state=empty (one action, rule L3); ?state=loading. Viewer: ?tz= sets the patient's zone.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, LinkButton } from "@/components/ui";
import type { Locale } from "@/lib/format";
import { patientReceipts } from "@/lib/sample";
import { patientZone, tzOverride, type SearchParams } from "./_parts/receipts";
import { ReceiptRows } from "./_parts/ReceiptRows";
import Loading from "./loading";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "receipts" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function ReceiptsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  if (sp.state === "loading") return <Loading />;

  const loc = locale as Locale;
  const t = await getTranslations("receipts");
  const tz = tzOverride(sp);
  const receipts = sp.state === "empty" ? [] : patientReceipts();
  const currencies = [...new Set(receipts.map((r) => r.currency))];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-ink-700">{t("lead")}</p>
      </header>
      {receipts.length === 0 ? (
        <EmptyState title={t("empty.title")} body={t("empty.body")} action={<LinkButton href="/search">{t("empty.action")}</LinkButton>} />
      ) : (
        <div className="flex flex-col gap-3">
          <ReceiptRows receipts={receipts} locale={loc} zone={patientZone(tz)} tz={tz} />
          {currencies.length === 1 ? <p className="text-sm text-ink-500">{t("currencyNote", { currency: currencies[0] ?? "" })}</p> : null}
        </div>
      )}
    </div>
  );
}
