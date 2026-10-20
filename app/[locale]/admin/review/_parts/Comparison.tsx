// The registry data and the doctor's entries side by side (screen 38 layout call). The registry column is the CMS file joined on
// the NPI (rule B1: the profile started from it); the doctor column is what the doctor entered in the builder. Each row says
// whether the two agree, differ, or need the primary source because the registry file does not carry the item (licence and
// board are never in it, which is why the checklist above exists). Phone and desktop share one layout: the field name over
// the two values.
import { getTranslations } from "next-intl/server";
import { Badge, Surface, type BadgeTone } from "@/components/ui";
import { reviewVerifiers } from "@/config/verifiers";
import { formatDate, formatNumber, type Locale } from "@/lib/format";
import type { Claim } from "./queue";

type Row = { key: string; registry: string | null; doctor: string | null };
type Agreement = "same" | "differs" | "source";

const tone: Record<Agreement, BadgeTone> = { same: "success", differs: "warning", source: "pending" };

function agreement(r: Row): Agreement {
  if (!r.registry || !r.doctor) return "source";
  return r.registry.trim().toLowerCase() === r.doctor.trim().toLowerCase() ? "same" : "differs";
}

export async function Comparison({ claim, locale }: { claim: Claim; locale: Locale }) {
  const t = await getTranslations("adminReview.compare");
  const { doctor: d, registry: r, row, board, licenceState } = claim;
  const ar = locale === "ar";
  const school = (name: string | null, year: number | null) =>
    name ? (year ? `${name} · ${formatNumber(year, locale, { useGrouping: false })}` : name) : null;
  const stateName = licenceState ? (ar ? licenceState.ar : licenceState.en) : null;

  const rows: Row[] = [
    { key: "name", registry: r.nameEn, doctor: d.nameEn },
    { key: "specialty", registry: ar ? r.specialtyAr : r.specialtyEn, doctor: ar ? d.specialtyAr : d.specialtyEn },
    { key: "city", registry: ar ? r.cityAr : r.cityEn, doctor: ar ? d.cityAr : d.cityEn },
    { key: "npi", registry: d.npi, doctor: d.npi },
    { key: "school", registry: school(r.medicalSchool, r.graduationYear), doctor: school(d.medicalSchool, d.graduationYear) },
    { key: "licence", registry: null, doctor: stateName && row.licenceNumber ? t("licenceValue", { state: stateName, number: row.licenceNumber }) : null },
    {
      key: "board",
      registry: null,
      doctor: board.status === "certified" ? t("boardCertified", { board: board.name ?? "" }) : board.status === "eligible" ? t("boardEligible") : null,
    },
  ];
  const asOf = r.asOf ? formatDate(new Date(`${r.asOf}T00:00:00Z`), "UTC", locale) : null;
  const differs = rows.filter((x) => agreement(x) === "differs").length;

  return (
    <section aria-labelledby="compare-title">
      <Surface className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="compare-title" className="text-lg font-bold text-sea-900">
            {t("title")}
          </h2>
          {differs ? <Badge tone="warning">{t("differsCount", { count: differs, countLabel: formatNumber(differs, locale) })}</Badge> : null}
        </div>
        <p className="-mt-1 text-sm text-ink-700">
          {asOf ? t("lead", { date: asOf }) : t("leadNoDate")}{" "}
          <a
            href={reviewVerifiers.npiRegistry.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sea-700 underline-offset-2 hover:underline"
          >
            {t("npiLink")}
            <span className="sr-only"> {t("newTab")}</span>
          </a>
        </p>
        <div>
          <div aria-hidden="true" className="grid grid-cols-2 gap-x-4 border-b border-sand-300 pb-2 text-sm font-semibold text-ink-500">
            <span>{t("registry")}</span>
            <span>{t("doctor")}</span>
          </div>
          <dl className="divide-y divide-sand-200">
            {rows.map((x) => {
              const a = agreement(x);
              const ltr = x.key === "npi" || x.key === "name";
              return (
                <div key={x.key} className="grid grid-cols-2 gap-x-4 gap-y-1 py-2.5">
                  <dt className="col-span-2 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-ink-700">
                    {t(`fields.${x.key}`)}
                    <Badge tone={tone[a]}>{t(`agreement.${a}`)}</Badge>
                  </dt>
                  <dd className="min-w-0 break-words text-ink-900">
                    <span className="sr-only">{t("registry")}: </span>
                    {x.registry ? <span className={ltr ? "ltr-run" : undefined}>{x.registry}</span> : <span className="text-sm text-ink-500">{t("notInFile")}</span>}
                  </dd>
                  <dd className="min-w-0 break-words text-ink-900">
                    <span className="sr-only">{t("doctor")}: </span>
                    {x.doctor ? <span className={ltr ? "ltr-run" : undefined}>{x.doctor}</span> : <span className="text-sm text-ink-500">{t("notEntered")}</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </Surface>
    </section>
  );
}
