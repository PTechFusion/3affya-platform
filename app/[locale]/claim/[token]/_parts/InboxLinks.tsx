// "Open Gmail" style buttons (rule F7). External, so they open a new tab; the page's no-referrer policy keeps the invite token
// out of the Referer header the mail provider receives.
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui";
import type { InboxLink } from "./inbox";

export function InboxLinks({ links }: { links: InboxLink[] }) {
  const t = useTranslations("claim.inbox");
  if (!links.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {links.map((link) => (
        <li key={link.provider}>
          <LinkButton href={link.href} target="_blank" rel="noopener noreferrer" variant="secondary">
            {t(link.provider)}
            <span className="sr-only"> ({t("newTab")})</span>
          </LinkButton>
        </li>
      ))}
    </ul>
  );
}
