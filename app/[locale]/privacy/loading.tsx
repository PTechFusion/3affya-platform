// Loading state for /privacy (rule L1): the real frame and title, content-shaped skeletons for the text.
import { useTranslations } from "next-intl";
import { LegalPageSkeleton } from "@/components/brand/LegalPage";

export default function PrivacyLoading() {
  const t = useTranslations("legal.privacy");
  return <LegalPageSkeleton title={t("title")} />;
}
