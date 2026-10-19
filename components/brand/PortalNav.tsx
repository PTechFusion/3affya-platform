"use client";
// Portal navigation, two renderings of one list: a side column on desktop, a bottom bar on phone (first four items plus More).
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ChevronNext } from "@/components/ui";

export type PortalNavItem = { href: string; label: string; hint?: string };

const VISIBLE_ON_PHONE = 4;

export function PortalNav({ items, home, variant }: { items: PortalNavItem[]; home: string; variant: "side" | "bottom" }) {
  const t = useTranslations("portal");
  const pathname = usePathname();
  const isActive = (href: string) => (href === home ? pathname === home : pathname === href || pathname.startsWith(`${href}/`));

  if (variant === "side") {
    return (
      <nav aria-label={t("sections")} className="sticky top-24 flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex items-center justify-between gap-2 rounded-[var(--radius-field)] px-3 py-2.5 text-[15px] font-semibold",
                active ? "bg-sea-100 text-sea-900" : "text-ink-700 hover:bg-sand-100 hover:text-sea-900",
              ].join(" ")}
            >
              {item.label}
              {active ? <ChevronNext className="size-4 text-sea-700" /> : null}
            </Link>
          );
        })}
      </nav>
    );
  }

  const visible = items.slice(0, VISIBLE_ON_PHONE);
  const moreActive = !visible.some((i) => isActive(i.href)) && pathname !== home ? true : pathname === home;
  return (
    <nav
      aria-label={t("sections")}
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-sand-300 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {visible.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={["flex min-h-14 flex-col items-center justify-center px-1 text-center text-[11.5px] font-semibold leading-tight", active ? "text-sea-700" : "text-ink-700"].join(" ")}
          >
            <span aria-hidden="true" className={["mb-1 h-1 w-6 rounded-full", active ? "bg-sea-700" : "bg-transparent"].join(" ")} />
            {item.label}
          </Link>
        );
      })}
      <Link
        href={home}
        aria-current={moreActive ? "page" : undefined}
        className={["flex min-h-14 flex-col items-center justify-center px-1 text-center text-[11.5px] font-semibold leading-tight", moreActive ? "text-sea-700" : "text-ink-700"].join(" ")}
      >
        <span aria-hidden="true" className={["mb-1 h-1 w-6 rounded-full", moreActive ? "bg-sea-700" : "bg-transparent"].join(" ")} />
        {t("more")}
      </Link>
    </nav>
  );
}
