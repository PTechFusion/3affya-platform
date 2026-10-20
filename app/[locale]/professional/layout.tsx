// professional portal shell (task 1.7). Section routes are listed in docs/screens/PLAYBOOK.md; screens fill them in later waves.
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PortalShell } from "@/components/brand/PortalShell";
import { portalItems } from "@/lib/portal-nav";

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal");
  return (
    <PortalShell portal="professional" items={portalItems("professional", t)}>
      {children}
    </PortalShell>
  );
}
