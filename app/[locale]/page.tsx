import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { WaterHero } from "@/components/brand/WaterHero";
import { Link } from "@/i18n/navigation";

// Placeholder home. The real home page is task 1.6 (docs/screens/01-home.md). This exists so /ar and /en render with the frame.
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  return (
    <>
      <SiteNav />
      <WaterHero className="min-h-[520px]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-32 pt-14 sm:px-6 sm:pt-20">
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            <span className="text-gold-300">{t("title")}</span>
          </h1>
          <p className="max-w-xl text-lg text-white/90 sm:text-xl">{t("subtitle")}</p>
          <form className="flex max-w-xl flex-col gap-2 sm:flex-row" action="/" role="search">
            <input
              type="search"
              name="q"
              placeholder={t("searchPlaceholder")}
              className="min-h-13 flex-1 rounded-[var(--radius-field)] border-0 bg-white px-4 text-ink-900 shadow-[var(--shadow-nav)]"
            />
            <button type="submit" className="min-h-13 rounded-[var(--radius-field)] bg-sea-700 px-6 font-semibold text-white hover:bg-sea-800">
              {t("search")}
            </button>
          </form>
          <p className="text-sm text-white/80">{tc("notForEmergencies")}</p>
        </div>
      </WaterHero>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="rounded-[var(--radius-field)] border border-gold-300 bg-gold-100 px-4 py-3 text-gold-700">
          {t("scaffoldNote")}{" "}
          <Link href="/brand" className="font-semibold underline">
            /brand
          </Link>
        </p>
      </main>
    </>
  );
}
