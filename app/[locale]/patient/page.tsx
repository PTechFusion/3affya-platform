// patient portal overview: every section as a card, which is also the More target of the phone bottom bar.
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PortalOverview } from "@/components/brand/PortalOverview";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal");
  return <PortalOverview portal="patient" t={t} />;
}
