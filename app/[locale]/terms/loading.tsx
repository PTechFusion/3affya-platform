// Loading state for /terms (rule L1): the real frame and title, content-shaped skeletons for the text.
import { useTranslations } from "next-intl";
import { LegalPageSkeleton } from "@/components/brand/LegalPage";

export default function TermsLoading() {
  const t = useTranslations("legal.terms");
  return <LegalPageSkeleton title={t("title")} />;
}
