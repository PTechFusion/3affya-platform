// Receipts list loading state (rule L1): the real heading, lead and column names, three rows as skeletons. The page renders this
// for ?state=loading too.
import { useTranslations } from "next-intl";
import { ReceiptRowsSkeleton } from "./_parts/ReceiptSkeletons";

export default function Loading() {
  const t = useTranslations("receipts");
  return (
    <div aria-busy="true" className="flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-ink-700">{t("lead")}</p>
        <p role="status" className="sr-only">
          {t("loading")}
        </p>
      </header>
      <ReceiptRowsSkeleton />
    </div>
  );
}
