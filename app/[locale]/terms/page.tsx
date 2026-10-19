// Screen 16, Legal: terms of use (docs/screens/16-legal-pages-4.md). States: default; ?state=loading (skeleton).
// Viewer country via ?country= (default SA) sets the emergency number in the visits section and the footer.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage, LegalPageSkeleton } from "@/components/brand/LegalPage";
import { ChevronNext } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business } from "@/config/business";
import { durationLabel, legalMetadata, loadLegalDoc } from "@/lib/legal";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  return legalMetadata(locale, "terms");
}

export default async function TermsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const viewer = viewerFrom(sp);
  const emergency = emergencyNumberFor(viewer.country);
  const doc = await loadLegalDoc(locale, "terms", {
    emergency,
    holdMinutes: await durationLabel(locale, "minutes", business.slotHoldMinutes),
  });
  if (sp.state === "loading") return <LegalPageSkeleton title={doc.title} />;

  const t = await getTranslations("legal.terms.links");
  const links: Record<string, { href: string; label: string }> = {
    booking: { href: "/fees", label: t("fees") },
    cancel: { href: "/refunds", label: t("refunds") },
  };
  const sections = doc.sections.map((s) => {
    const link = links[s.id];
    return link
      ? {
          ...s,
          extra: (
            <Link href={link.href} className="inline-flex items-center gap-1 font-semibold text-sea-700 hover:underline">
              {link.label} <ChevronNext />
            </Link>
          ),
        }
      : s;
  });
  return <LegalPage {...doc} sections={sections} emergencyNumber={emergency} />;
}
