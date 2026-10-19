// Portal landing: heading plus one card per section. Also what the phone bottom bar's More opens (rule H5).
import { Link } from "@/i18n/navigation";
import { ChevronNext, SectionHeading, Surface } from "@/components/ui";
import { portalItems } from "@/lib/portal-nav";
import type { Portal } from "@/lib/dev-role";

export function PortalOverview({ portal, t }: { portal: Portal; t: (key: string) => string }) {
  const items = portalItems(portal, t);
  return (
    <>
      <SectionHeading title={t(`${portal}.title`)} lead={t(`${portal}.lead`)} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="block h-full rounded-[var(--radius-card)]">
              <Surface className="flex h-full items-start justify-between gap-3 hover:border-sea-500">
                <div>
                  <h2 className="font-bold text-sea-900">{item.label}</h2>
                  <p className="mt-1 text-sm text-ink-700">{item.hint}</p>
                </div>
                <ChevronNext className="mt-1 size-4 shrink-0 text-sea-700" />
              </Surface>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
