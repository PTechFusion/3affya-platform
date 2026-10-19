"use client";
// Language switch in its own script with a globe, never a flag (rule H10). Keeps the viewer on the same page in the other
// locale; pass `href` to send them somewhere specific instead.
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { GlobeIcon } from "@/components/brand/SiteNav";

export function LanguageSwitch({ href }: { href?: string }) {
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <Link
      href={href ?? pathname ?? "/"}
      locale={other}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-field)] px-3 text-[15px] font-semibold text-sea-800 hover:bg-sand-100"
      lang={other}
    >
      <GlobeIcon />
      {other === "ar" ? tc("arabic") : tc("english")}
    </Link>
  );
}
