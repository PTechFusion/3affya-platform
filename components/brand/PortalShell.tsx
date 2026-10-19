// Portal frame for /patient, /professional and /admin (task 1.7). Desktop: side navigation at the start edge. Phone: slim
// header plus a bottom bar with up to four sections visible and More for the rest (rule H5). Pages inside render their own
// headings; the shell owns navigation, the language switch and the dev role bar only.
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "@/components/brand/SiteNav";
import { PortalNav, type PortalNavItem } from "@/components/brand/PortalNav";
import { devRoleSwitchEnabled, portals, type Portal } from "@/lib/dev-role";

export type { PortalNavItem };

export function PortalShell({ portal, items, children }: { portal: Portal; items: PortalNavItem[]; children: React.ReactNode }) {
  const t = useTranslations("portal");
  const home = `/${portal}`;
  return (
    <div className="min-h-dvh bg-sand-50 pb-20 lg:pb-0">
      {devRoleSwitchEnabled ? (
        <div className="bg-gold-100 text-gold-700">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-xs font-semibold sm:px-6">
            <span>{t("viewingAs")}</span>
            {portals.map((p) => (
              <Link key={p} href={`/${p}`} className={p === portal ? "underline underline-offset-4" : "opacity-70 hover:opacity-100"}>
                {t(`${p}.title`)}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <header className="sticky top-0 z-20 border-b border-sand-400/60 bg-sand-50/95 shadow-[var(--shadow-nav)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center" aria-label="3affya">
              <Image src="/brand/3affya_wordmark_transparent.png" alt="3affya" width={1479} height={492} priority className="h-9 w-auto" />
            </Link>
            <span aria-hidden="true" className="h-6 w-px bg-sand-300" />
            <Link href={home} className="truncate text-[15px] font-semibold text-sea-900">
              {t(`${portal}.title`)}
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitch href={home} />
            <Link href="/" className="hidden min-h-11 items-center rounded-[var(--radius-field)] px-3 text-[15px] font-semibold text-ink-700 hover:bg-sand-100 sm:inline-flex">
              {t("signOut")}
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:py-8">
        <aside className="hidden w-60 shrink-0 lg:block">
          <PortalNav items={items} home={home} variant="side" />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <PortalNav items={items} home={home} variant="bottom" />
    </div>
  );
}
