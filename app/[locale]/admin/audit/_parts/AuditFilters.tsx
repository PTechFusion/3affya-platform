// The filter form (screen 47): actor and action up front, target and the date range one level down under More filters (rule
// A5). A plain GET form, so the filters live in the URL (rule S3): it works before JavaScript loads, survives a reload and can be
// shared. Apply sits after every field in the tab order; from sm up it is drawn at the end of the first row.
import { useTranslations } from "next-intl";
import { Button, Disclosure, Field, Input, Select } from "@/components/ui";
import { AUDIT_TARGETS } from "@/lib/audit";
import { formatNumber, type Locale } from "@/lib/format";
import { ACTOR_KINDS, actionsByArea, adminActorIds, moreCount, systemActorIds, type AuditFilters } from "./audit";
import { actorName, isolatedZone, type T } from "./labels";

export function AuditFiltersForm({
  filters,
  dateError,
  zoneLabel,
  tz,
  locale,
}: {
  filters: AuditFilters;
  dateError: boolean;
  zoneLabel: string;
  tz: string | undefined;
  locale: Locale;
}) {
  const t = useTranslations("adminAudit") as unknown as T;
  const more = moreCount(filters);
  const dateDescribedBy = dateError ? "audit-to-error audit-date-hint" : "audit-date-hint";
  return (
    <form method="get" aria-label={t("filters.label")} className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-4 sm:px-5">
      {tz ? <input type="hidden" name="tz" value={tz} /> : null}
      {/* Phone stacks the two selects: side by side they cut the chosen action short ("Verification ap"). */}
      <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:gap-x-4 sm:gap-y-1">
        <Field id="audit-actor" label={t("filters.actor")}>
          <Select id="audit-actor" name="actor" defaultValue={filters.actor ?? ""}>
            <option value="">{t("filters.allActors")}</option>
            <optgroup label={t("filters.admins")}>
              {adminActorIds().map((id) => (
                <option key={id} value={id}>
                  {actorName(id, locale, t)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("filters.people")}>
              {ACTOR_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`filters.any.${kind}`)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("filters.system")}>
              {systemActorIds().map((id) => (
                <option key={id} value={id}>
                  {actorName(id, locale, t)}
                </option>
              ))}
            </optgroup>
          </Select>
        </Field>
        <Field id="audit-action" label={t("filters.action")}>
          <Select id="audit-action" name="action" defaultValue={filters.action ?? ""}>
            <option value="">{t("filters.allActions")}</option>
            {actionsByArea.map(({ area, actions }) => (
              <optgroup key={area} label={t(`areas.${area}`)}>
                <option value={area}>{t(`areaAll.${area}`)}</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {t(`actions.${a}`)}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <div className="col-span-full">
          <Disclosure
            open={more > 0 || dateError}
            summary={more ? t("filters.moreCount", { count: formatNumber(more, locale) }) : t("filters.more")}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Field id="audit-target" label={t("filters.target")}>
                  <Select id="audit-target" name="target" defaultValue={filters.target ?? ""}>
                    <option value="">{t("filters.allTargets")}</option>
                    {AUDIT_TARGETS.map((type) => (
                      <option key={type} value={type}>
                        {t(`targets.${type}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field id="audit-from" label={t("filters.from")}>
                <Input id="audit-from" type="date" name="from" dir="ltr" defaultValue={filters.from ?? ""} aria-describedby="audit-date-hint" />
              </Field>
              <Field id="audit-to" label={t("filters.to")} error={dateError ? t("filters.dateOrder") : undefined}>
                <Input
                  id="audit-to"
                  type="date"
                  name="to"
                  dir="ltr"
                  defaultValue={filters.to ?? ""}
                  invalid={dateError}
                  aria-describedby={dateDescribedBy}
                />
              </Field>
            </div>
            <p id="audit-date-hint" className="mt-2 text-sm text-ink-500">
              {t("filters.dateHint", { zone: isolatedZone(zoneLabel, locale) })}
            </p>
          </Disclosure>
        </div>
        <Button type="submit" className="col-span-full w-full sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:w-auto">
          {t("filters.apply")}
        </Button>
      </div>
    </form>
  );
}
