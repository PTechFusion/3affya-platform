// Screen 16, Legal: cancellations and refunds (docs/screens/16-legal-pages-4.md, rules P5, P13). States: default;
// ?state=loading (skeleton). The cut-off comes from config/business.ts (default until Q8). Viewer country via ?country=.
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalPage, LegalPageSkeleton } from "@/components/brand/LegalPage";
import { business } from "@/config/business";
import { durationLabel, legalMetadata, loadLegalDoc } from "@/lib/legal";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  return legalMetadata(locale, "refunds");
}

export default async function RefundsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const viewer = viewerFrom(sp);
  const doc = await loadLegalDoc(locale, "refunds", {
    cutoff: await durationLabel(locale, "hours", business.fullRefundCutoffHours),
  });
  if (sp.state === "loading") return <LegalPageSkeleton title={doc.title} />;
  return <LegalPage {...doc} emergencyNumber={emergencyNumberFor(viewer.country)} />;
}
