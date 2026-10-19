// Footer for public pages (rule H9): entity and address, contact route, four link groups, the emergency line.
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter({ emergencyNumber }: { emergencyNumber: string }) {
  const t = useTranslations("footer");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const groups: Array<{ title: string; links: Array<[string, string]> }> = [
    {
      title: t("patients"),
      links: [
        ["/search", tn("doctors")],
        ["/how-it-works", tn("howItWorks")],
        ["/why-us-training", tn("whyUs")],
        ["/faq", t("faq")],
      ],
    },
    {
      title: t("company"),
      links: [
        ["/about", t("about")],
        ["/contact", t("contact")],
        ["/for-professionals", tn("forProfessionals")],
        ["/ai-tools", t("aiTools")],
      ],
    },
    {
      title: t("legal"),
      links: [
        ["/privacy", t("privacy")],
        ["/terms", t("terms")],
        ["/fees", t("fees")],
        ["/refunds", t("refunds")],
      ],
    },
  ];
  return (
    <footer className="border-t border-sand-200 bg-sand-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Image src="/brand/3affya_wordmark_transparent.png" alt="3affya" width={1479} height={492} className="h-10 w-auto" />
          <p className="max-w-sm text-ink-700">{tc("tagline")}</p>
          <address className="space-y-1 text-sm not-italic text-ink-700">
            <p>{t("entity")}</p>
            <p>{t("address")}</p>
            <p>
              <a href="mailto:hello@3affya.com" className="ltr-run font-semibold text-sea-700 underline-offset-2 hover:underline">
                hello@3affya.com
              </a>
            </p>
          </address>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">{g.title}</h2>
            <ul className="space-y-2">
              {g.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-ink-900 hover:text-sea-700">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-sand-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-ink-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{tc("notForEmergenciesWithNumber", { number: emergencyNumber })}</p>
          <p className="text-ink-500">{t("copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
