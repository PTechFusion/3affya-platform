// Endowed progress (rule B3): the checklist opens partly filled from the registry row and says how many steps are left.
// Rendered inside the claim flow so confirming the email ticks its line without a reload.
import { useLocale, useTranslations } from "next-intl";
import { CheckIcon } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";

export type ChecklistKey = "name" | "npi" | "specialty" | "email" | "photo" | "credentials";
export type ChecklistStatus = "registry" | "done" | "current" | "todo";
export type ChecklistItem = { key: ChecklistKey; status: ChecklistStatus; detail?: string };

export function ClaimChecklist({ items }: { items: ChecklistItem[] }) {
  const t = useTranslations("claim.checklist");
  const locale = useLocale() as Locale;
  const done = items.filter((i) => i.status === "registry" || i.status === "done").length;
  const total = items.length;
  return (
    <section aria-labelledby="claim-checklist-title" className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="claim-checklist-title" className="text-lg font-bold text-sea-900">
          {t("title")}
        </h2>
        <p className="tabular text-sm font-semibold text-ink-700">
          {t("progress", { done: formatNumber(done, locale), total: formatNumber(total, locale) })}
        </p>
      </div>
      <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-sand-200">
        <div className="h-full rounded-full bg-lagoon-600" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <ul className="mt-4 divide-y divide-sand-200 rounded-[var(--radius-card)] border border-sand-200 bg-white px-4">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3 py-3">
            <Mark status={item.status} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink-900">{t(item.key)}</span>
              {item.detail ? (
                <span className="ltr-run tabular text-sm text-ink-700" dir="ltr">
                  {item.detail}
                </span>
              ) : null}
            </span>
            <span className={["shrink-0 text-sm", item.status === "current" ? "font-semibold text-sea-700" : "text-ink-500"].join(" ")}>
              {t(`status.${item.status}`)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Done: lagoon check (never mirrored, rule R2). This step: sea ring. Still to do: empty sand ring. */
function Mark({ status }: { status: ChecklistStatus }) {
  if (status === "registry" || status === "done") {
    return (
      <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
        <CheckIcon className="size-3.5" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={["inline-flex size-6 shrink-0 rounded-full", status === "current" ? "ring-2 ring-inset ring-sea-700" : "ring-1 ring-inset ring-sand-400"].join(" ")}
    />
  );
}
