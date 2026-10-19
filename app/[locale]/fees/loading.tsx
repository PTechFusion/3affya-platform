// Loading state for /fees (rule L1): the real frame and title, content-shaped skeletons for the text.
import { useTranslations } from "next-intl";
import { LegalPageSkeleton } from "@/components/brand/LegalPage";

export default function FeesLoading() {
  const t = useTranslations("legal.fees");
  return <LegalPageSkeleton title={t("title")} />;
}
