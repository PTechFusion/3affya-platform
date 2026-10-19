// "Who can see your summary", first on the page (rule T7): the patient, then every doctor who can open it now with the day that
// ends, then the plain confidentiality line (rule T12). Rendered by the live page and by the loading skeleton (`people` null:
// the patient's own line is real, the doctors are a skeleton line).
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui";

export function WhoCanSee({ people }: { people: Array<{ id: string; name: string; until: string }> | null }) {
  const t = useTranslations("sharing");
  const line = "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2";
  return (
    <section aria-labelledby="sharing-who-title" className="rounded-[var(--radius-card)] border border-sky-500/40 bg-sky-100 p-5">
      <h2 id="sharing-who-title" className="text-lg font-bold text-sea-900">
        {t("panel.title")}
      </h2>
      <ul className="mt-1 max-w-xl divide-y divide-sky-500/25">
        <li className={line}>
          <span className="font-semibold text-ink-900">{t("panel.you")}</span>
          <span className="text-sm text-ink-700">{t("panel.always")}</span>
        </li>
        {people === null ? (
          <li className={line}>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-28" />
          </li>
        ) : people.length ? (
          people.map((p) => (
            <li key={p.id} className={line}>
              <span className="font-semibold text-ink-900">{p.name}</span>
              <span className="text-sm text-ink-700">{t("panel.until", { date: p.until })}</span>
            </li>
          ))
        ) : (
          <li className={`${line} text-sm text-ink-700`}>{t("panel.noDoctor")}</li>
        )}
      </ul>
      <p className="mt-2 text-sm text-ink-700">{t("panel.private")}</p>
    </section>
  );
}
