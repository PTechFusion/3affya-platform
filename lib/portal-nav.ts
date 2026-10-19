// The portal route map (docs/screens/PLAYBOOK.md). One place for section slugs so shells, overview cards and screens agree.
import type { Portal } from "@/lib/dev-role";
import type { PortalNavItem } from "@/components/brand/PortalNav";

export const portalSections: Record<Portal, Array<{ key: string; slug: string }>> = {
  patient: [
    { key: "bookings", slug: "bookings" },
    { key: "receipts", slug: "receipts" },
    { key: "records", slug: "records" },
    { key: "sharing", slug: "sharing" },
    { key: "settings", slug: "settings" },
  ],
  professional: [
    { key: "builder", slug: "builder" },
    { key: "availability", slug: "availability" },
    { key: "card", slug: "card" },
    { key: "inbox", slug: "inbox" },
    { key: "membership", slug: "membership" },
    { key: "payouts", slug: "payouts" },
    { key: "shared", slug: "shared" },
  ],
  admin: [
    { key: "review", slug: "review" },
    { key: "listings", slug: "listings" },
    { key: "specialties", slug: "specialties" },
    { key: "removals", slug: "removals" },
    { key: "members", slug: "members" },
    { key: "payments", slug: "payments" },
    { key: "aiJobs", slug: "ai-jobs" },
    { key: "outreach", slug: "outreach" },
    { key: "audit", slug: "audit" },
  ],
};

type T = (key: string) => string;

export function portalItems(portal: Portal, t: T): PortalNavItem[] {
  return portalSections[portal].map(({ key, slug }) => ({
    href: `/${portal}/${slug}`,
    label: t(`${portal}.nav.${key}`),
    hint: t(`${portal}.hint.${key}`),
  }));
}
