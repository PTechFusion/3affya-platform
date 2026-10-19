// "Open Gmail" style buttons for an email-code step (rule F7), one per provider from lib/inbox inboxLinksFor. External, so they
// open a new tab; a page that carries a secret in its URL sets referrer "no-referrer" so the mail provider never receives it.
// The caller passes the labels from its own namespace (claim, sign-in).
import { LinkButton } from "@/components/ui";
import type { InboxLink, InboxProvider } from "@/lib/inbox";

export type InboxLinkLabels = Record<InboxProvider, string> & { newTab: string };

export function InboxLinks({ links, labels }: { links: InboxLink[]; labels: InboxLinkLabels }) {
  if (!links.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {links.map((link) => (
        <li key={link.provider}>
          <LinkButton href={link.href} target="_blank" rel="noopener noreferrer" variant="secondary">
            {labels[link.provider]}
            <span className="sr-only"> ({labels.newTab})</span>
          </LinkButton>
        </li>
      ))}
    </ul>
  );
}
