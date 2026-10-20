// The trail back to Records (rule S15; on phone only the Records back link shows) and the page title, shared by every state.
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui";

export function SummaryPageHeader() {
  const t = useTranslations("patientSummary");
  const tp = useTranslations("portal");
  return (
    <>
      <div className="print:hidden">
        <Breadcrumbs
          label={t("breadcrumb")}
          items={[
            { label: tp("patient.title"), href: "/patient" },
            { label: tp("patient.nav.records"), href: "/patient/records" },
            { label: t("title") },
          ]}
        />
      </div>
      <h1 className="mt-3 text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
    </>
  );
}
