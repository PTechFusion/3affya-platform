// Provider inbox links for the code step (rule F7): an "Open Gmail" button beats a passive "check your email". A known consumer
// domain gets its own provider; any other domain (a practice address) gets Gmail and Outlook, the two hosts most practice
// mail runs on. The real flow (task 2.3) can look the MX record up server side to pick one.
export type InboxProvider = "gmail" | "outlook" | "yahoo" | "icloud";
export type InboxLink = { provider: InboxProvider; href: string };

const PROVIDERS: Array<{ provider: InboxProvider; href: string; domains: string[] }> = [
  { provider: "gmail", href: "https://mail.google.com/mail/u/0/#inbox", domains: ["gmail.com", "googlemail.com"] },
  { provider: "outlook", href: "https://outlook.live.com/mail/0/inbox", domains: ["outlook.com", "hotmail.com", "live.com", "msn.com"] },
  { provider: "yahoo", href: "https://mail.yahoo.com/", domains: ["yahoo.com", "ymail.com"] },
  { provider: "icloud", href: "https://www.icloud.com/mail", domains: ["icloud.com", "me.com", "mac.com"] },
];

const WORKSPACE: InboxLink[] = [
  { provider: "gmail", href: "https://mail.google.com/mail/u/0/#inbox" },
  { provider: "outlook", href: "https://outlook.office.com/mail/" },
];

export function inboxLinksFor(email: string): InboxLink[] {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  const known = PROVIDERS.find((p) => p.domains.includes(domain));
  return known ? [{ provider: known.provider, href: known.href }] : WORKSPACE;
}
