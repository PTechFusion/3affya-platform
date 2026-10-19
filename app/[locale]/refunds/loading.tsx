// Loading state for /refunds (rule L1): the real frame and title, content-shaped skeletons for the text.
import { useTranslations } from "next-intl";
import { LegalPageSkeleton } from "@/components/brand/LegalPage";

export default function RefundsLoading() {
  const t = useTranslations("legal.refunds");
  return <LegalPageSkeleton title={t("title")} />;
}
