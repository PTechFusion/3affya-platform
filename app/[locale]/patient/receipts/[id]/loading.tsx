// Receipt loading state (rule L1): the trail, the heading, the total and the three lines under their real names, the visit card
// with both time labels; values as skeletons. The page renders this for ?state=loading too.
import { useTranslations } from "next-intl";
import { Breadcrumbs, Skeleton } from "@/components/ui";
import { ReceiptDetailSkeleton } from "../_parts/ReceiptSkeletons";

export default function Loading() {
  const t = useTranslations("receipts");
  const tp = useTranslations("portal");
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Breadcrumbs
        label={t("detail.breadcrumb")}
        items={[{ label: tp("patient.title"), href: "/patient" }, { label: t("title"), href: "/patient/receipts" }, { label: t("detail.title") }]}
      />
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("detail.title")}</h1>
          <Skeleton className="h-7 w-20 rounded-[var(--radius-tag)]" />
        </div>
        <Skeleton className="mt-2.5 h-5 w-72 max-w-full" />
        <p role="status" className="sr-only">
          {t("detail.loading")}
        </p>
      </header>
      <ReceiptDetailSkeleton />
    </div>
  );
}
