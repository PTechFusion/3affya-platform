// Screen 16, Legal: privacy notice, doubling as the Notice of Privacy Practices (docs/screens/16-legal-pages-4.md, rule T9).
// States: default; ?state=loading (skeleton). Viewer country for the footer emergency line via ?country= (default SA).
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalContactLinks, LegalPage, LegalPageSkeleton } from "@/components/brand/LegalPage";
import { business } from "@/config/business";
import { durationLabel, legalMetadata, loadLegalDoc } from "@/lib/legal";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  return legalMetadata(locale, "privacy");
}

export default async function PrivacyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const viewer = viewerFrom(sp);
  const doc = await loadLegalDoc(locale, "privacy", {
    shareDays: await durationLabel(locale, "days", business.shareDefaultDays),
  });
  if (sp.state === "loading") return <LegalPageSkeleton title={doc.title} />;

  // The complaints contact sits inside its own section, not only in the footer (rule T9).
  const sections = doc.sections.map((s) => (s.id === "complaints" ? { ...s, extra: <LegalContactLinks /> } : s));
  return <LegalPage {...doc} sections={sections} emergencyNumber={emergencyNumberFor(viewer.country)} />;
}
