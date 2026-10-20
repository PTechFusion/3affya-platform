// Admin sign-in loading state (rule L1): the real frame (wordmark, language switch, the line under the card) and the first
// step's real step line, title and field label, with the lead, field, hint and Continue button as content-shaped skeletons.
// The page renders this for ?state=loading too.
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import { LoginFrame } from "./_parts/LoginFrame";
import { SIGN_IN_STEPS } from "./_parts/limits";

export default function Loading() {
  const t = useTranslations("adminLogin");
  const locale = useLocale() as Locale;
  return (
    <LoginFrame busy>
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <p className="text-sm font-semibold text-lagoon-800">{t("step", { step: formatNumber(1, locale), total: formatNumber(SIGN_IN_STEPS, locale) })}</p>
      <h1 className="mt-1 text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("email.title")}</h1>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-[15px] font-semibold text-ink-900">{t("email.label")}</p>
          <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
          <Skeleton className="mt-1 h-3.5 w-3/4" />
        </div>
        <Skeleton className="h-14 w-full rounded-[var(--radius-field)]" />
      </div>
    </LoginFrame>
  );
}
