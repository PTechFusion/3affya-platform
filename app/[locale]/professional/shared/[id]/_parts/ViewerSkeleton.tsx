// Loading state for one shared summary (rule L1): the real trail back to the list, skeletons for the name and share line,
// then the summary skeleton with the real AI label and block titles.
import { useTranslations } from "next-intl";
import { Breadcrumbs, Skeleton } from "@/components/ui";
import { SummaryViewerSkeleton } from "@/components/brand/SummaryViewer";

export function ViewerSkeleton() {
  const t = useTranslations("shared");
  const tp = useTranslations("portal");
  const ts = useTranslations("summary");
  return (
    <div>
      <Breadcrumbs
        label={t("viewer.breadcrumb")}
        items={[
          { label: tp("professional.title"), href: "/professional" },
          { label: t("title"), href: "/professional/shared" },
          { label: ts("loading") },
        ]}
      />
      <Skeleton className="mt-3 h-9 w-56 max-w-full" />
      <Skeleton className="mt-2 h-5 w-full max-w-xl" />
      <div className="mt-5">
        <SummaryViewerSkeleton />
      </div>
    </div>
  );
}
