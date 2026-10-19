// Sand nav bar from the approved hero: wordmark on sand, up to four visible links on phone (rule H5), language in its own script (H10).
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LinkButton } from "@/components/ui";

export function SiteNav() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  return (
    <header className="sticky top-0 z-20 border-b border-sand-400/60 bg-sand-50/95 shadow-[var(--shadow-nav)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <Link href="/" className="flex items-center" aria-label={tc("brand")}>
          <Image src="/brand/3affya_wordmark_transparent.png" alt="3affya" width={1479} height={492} priority className="h-10 w-auto sm:h-14" />
        </Link>
        <nav className="hidden items-center gap-6 text-[15px] font-semibold text-ink-900 md:flex" aria-label="Main">
          <Link href="/" className="hover:text-sea-700">{t("doctors")}</Link>
          <Link href="/" className="hover:text-sea-700">{t("howItWorks")}</Link>
          <Link href="/" className="hover:text-sea-700">{t("whyUs")}</Link>
          <Link href="/" className="hover:text-sea-700">{t("forProfessionals")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          {/* Wrapped so `hidden` is not fought by the button's own display utility. */}
          <div className="hidden sm:block">
            <LinkButton href="/search" className="whitespace-nowrap">
              {tc("findDoctor")}
            </LinkButton>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Language switch in its own script with a globe, never a flag (rule H10). Shared by the public nav and the portal shells. */
export function LanguageSwitch({ href = "/" }: { href?: string }) {
  const tc = useTranslations("common");
  const locale = useLocale();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <Link
      href={href}
      locale={other}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-field)] px-3 text-[15px] font-semibold text-sea-800 hover:bg-sand-100"
      lang={other}
    >
      <GlobeIcon />
      {other === "ar" ? tc("arabic") : tc("english")}
    </Link>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 10h16M10 2c3 3 3 13 0 16M10 2c-3 3-3 13 0 16" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
