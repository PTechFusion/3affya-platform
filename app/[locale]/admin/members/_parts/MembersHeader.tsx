// The heading of the members list and its skeleton: title, lead, and the way out to Stripe Billing, which holds the
// subscriptions themselves (ADR-6). The link opens a new tab and says so to screen readers.
import { useTranslations } from "next-intl";
import { stripeDashboardUrl } from "@/lib/stripe-dashboard";

export function MembersHeader() {
  const t = useTranslations("adminMembers");
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-ink-700">{t("lead")}</p>
      </div>
      <a
        href={stripeDashboardUrl("subscriptions")}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center font-semibold text-sea-700 underline-offset-2 hover:underline"
      >
        {t("stripeBilling")}
        <span className="sr-only"> ({t("newTab")})</span>
      </a>
    </header>
  );
}
