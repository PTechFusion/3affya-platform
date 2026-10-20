// Screen 17: 404 and 410. Centred message, search box, four specialty chips, contact link (rules S6, L4). The 410 variant adds
// one line that the doctor asked to be removed; the profile route renders it with variant="removed".
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { SearchBox, type SearchSuggestion } from "@/components/brand/SearchBox";
import { Chip } from "@/components/ui";
import { sampleSpecialties } from "@/lib/sample";
import { emergencyNumberFor } from "@/lib/viewer";

const CHIPS = ["family-medicine", "pediatrics", "dermatology", "cardiology"];

/** `specialtySlug`: on the 410 of a removed profile, the doctor's own specialty leads the chips so "another doctor in the same
 *  specialty" is one tap away (rule S6). */
export function MissingPage({ variant, country = "SA", specialtySlug }: { variant: "missing" | "removed"; country?: string; specialtySlug?: string }) {
  const t = useTranslations("missing");
  const locale = useLocale();
  const name = (s: { nameEn: string; nameAr: string }) => (locale === "ar" ? s.nameAr : s.nameEn);
  const suggestions: SearchSuggestion[] = sampleSpecialties.map((s) => ({ kind: "specialty", label: name(s), href: `/search?specialty=${s.slug}` }));
  const slugs = specialtySlug ? [specialtySlug, ...CHIPS.filter((s) => s !== specialtySlug)].slice(0, CHIPS.length) : CHIPS;
  const chips = slugs.map((slug) => sampleSpecialties.find((s) => s.slug === slug)).filter((s) => s !== undefined);
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex min-h-[60dvh] max-w-2xl flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-500">{variant === "removed" ? "410" : "404"}</p>
          <h1 className="mt-2 text-3xl font-bold text-sea-900 sm:text-4xl">{t(`${variant}.title`)}</h1>
          <p className="mt-3 text-ink-700">{t(`${variant}.body`)}</p>
        </div>
        <div className="w-full rounded-[var(--radius-card)] bg-lagoon-900 p-4 text-start sm:p-5">
          <SearchBox suggestions={suggestions} />
        </div>
        <ul className="flex flex-wrap justify-center gap-2" aria-label={t("popular")}>
          {chips.map((s) => (
            <li key={s.slug}>
              <Link href={`/search?specialty=${s.slug}`} className="rounded-[var(--radius-tag)]">
                <Chip>{name(s)}</Chip>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-ink-700">
          {t("contactLead")}{" "}
          <Link href="/contact" className="font-semibold text-sea-700 underline-offset-2 hover:underline">
            {t("contactLink")}
          </Link>
        </p>
      </main>
      <SiteFooter emergencyNumber={emergencyNumberFor(country)} />
    </>
  );
}
