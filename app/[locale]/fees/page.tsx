// Screen 16, Legal: fees (docs/screens/16-legal-pages-4.md, rules P1, P13, P15). States: default; ?state=loading (skeleton).
// Every rate comes from config/business.ts; the worked example uses the lowest published fee in the sample data.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage, LegalPageSkeleton } from "@/components/brand/LegalPage";
import { FeeBreakdown } from "@/components/brand/FeeBreakdown";
import { ChevronNext } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business } from "@/config/business";
import { feeLines } from "@/lib/fees";
import { formatMoney, formatNumber, type Locale, formatPercent } from "@/lib/format";
import { durationLabel, legalMetadata, loadLegalDoc } from "@/lib/legal";
import { lowestVerifiedFeeCents } from "@/lib/sample";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  return legalMetadata(locale, "fees");
}

export default async function FeesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  const viewer = viewerFrom(sp);
  const currency = business.currencyPresentment;
  const money = (cents: number) => formatMoney(cents, currency, loc);
  const values = {
    platformPct: formatPercent(business.firstVisitPlatformFeePct, loc),
    cardPct: formatPercent(business.cardProcessingPct, loc),
    cardFixed: money(business.cardProcessingFixedCents),
    holdMinutes: await durationLabel(locale, "minutes", business.slotHoldMinutes),
    currency,
    blockPrice: money(business.recordsBlockPriceCents),
    // "GB" reads clearly in English; the Arabic short form (غ.ب) does not, so Arabic spells the unit out. A no-break space
    // keeps the number and its unit on one line.
    blockSize: formatNumber(business.recordsBlockGb, loc, {
      style: "unit",
      unit: "gigabyte",
      unitDisplay: loc === "ar" ? "long" : "short",
    }).replace(/ /g, "\u00a0"),
  };
  const doc = await loadLegalDoc(locale, "fees", values);
  if (sp.state === "loading") return <LegalPageSkeleton title={doc.title} />;

  const t = await getTranslations("legal.fees");
  const exampleFee = lowestVerifiedFeeCents();
  const example = exampleFee != null ? feeLines(exampleFee) : undefined;
  const extras: Record<string, React.ReactNode> = {
    lines: example ? (
      <FeeBreakdown
        caption={t("example.caption", { fee: money(example.doctorFeeCents) })}
        lines={[
          { label: t("example.doctorFee"), detail: t("example.doctorFeeDetail"), amount: money(example.doctorFeeCents) },
          { label: t("example.platformFee"), detail: t("example.platformFeeDetail", values), amount: money(example.platformFeeCents) },
          { label: t("example.cardProcessing"), detail: t("example.cardProcessingDetail", values), amount: money(example.cardProcessingCents) },
        ]}
        total={{ label: t("example.total"), amount: money(example.totalCents) }}
      />
    ) : null,
    doctors: (
      <Link href="/for-professionals" className="inline-flex items-center gap-1 font-semibold text-sea-700 hover:underline">
        {t("links.doctors")} <ChevronNext />
      </Link>
    ),
  };
  const sections = doc.sections.map((s) => (extras[s.id] ? { ...s, extra: extras[s.id] } : s));
  return <LegalPage {...doc} sections={sections} emergencyNumber={emergencyNumberFor(viewer.country)} />;
}
