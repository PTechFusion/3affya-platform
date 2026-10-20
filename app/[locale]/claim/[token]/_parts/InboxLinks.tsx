// "Open Gmail" style buttons (rule F7): the shared components/brand/InboxLinks with the claim namespace's labels. The page's
// no-referrer policy keeps the invite token out of the Referer header the mail provider receives.
import { useTranslations } from "next-intl";
import { InboxLinks as SharedInboxLinks } from "@/components/brand/InboxLinks";
import type { InboxLink } from "./inbox";

export function InboxLinks({ links }: { links: InboxLink[] }) {
  const t = useTranslations("claim.inbox");
  const labels = { gmail: t("gmail"), outlook: t("outlook"), yahoo: t("yahoo"), icloud: t("icloud"), newTab: t("newTab") };
  return <SharedInboxLinks links={links} labels={labels} />;
}
