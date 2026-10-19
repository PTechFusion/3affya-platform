"use client";
// Language switch in its own script with a globe, never a flag (rule H10). Keeps the viewer on the same page, query string
// included (filters, ?state previews, ?country/?tz), in the other locale; pass `href` to send them somewhere specific instead.
import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { GlobeIcon } from "@/components/brand/SiteNav";

const linkClass = "inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-field)] px-3 text-[15px] font-semibold text-sea-800 hover:bg-sand-100";

function SwitchLink({ href, withQuery }: { href?: string; withQuery: boolean }) {
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const query = useQuery(withQuery);
  const other = locale === "ar" ? "en" : "ar";
  const target = href ?? `${pathname ?? "/"}${query ? `?${query}` : ""}`;
  return (
    <Link href={target} locale={other} className={linkClass} lang={other}>
      <GlobeIcon />
      {other === "ar" ? tc("arabic") : tc("english")}
    </Link>
  );
}

// useSearchParams needs a Suspense boundary during static rendering; the fallback is the same link without the query.
function useQuery(withQuery: boolean): string {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- `withQuery` is constant for a given component instance
  return withQuery ? useSearchParams().toString() : "";
}

export function LanguageSwitch({ href }: { href?: string }) {
  return (
    <Suspense fallback={<SwitchLink href={href} withQuery={false} />}>
      <SwitchLink href={href} withQuery={!href} />
    </Suspense>
  );
}
