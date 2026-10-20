"use client";
// The bar above the log: the count and zone (passed in from the server as children) and the one Export CSV action. Export is
// a routine read that changes nothing, so it runs without a confirmation (rule B10). It posts the current filters to the
// server action, which works before JavaScript loads; the result shows under the bar as a Notice. On a link the browser goes
// to the file.
import { useActionState, useEffect, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, Notice } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import { exportAuditLog, type AuditExportResult } from "../actions";

export function ExportBar({
  fields,
  initial,
  children,
}: {
  /** The filters in force, sent with the export so the file holds exactly what the page lists. */
  fields: Record<string, string>;
  /** ?export=preview opens the page with the prototype's answer already shown. */
  initial: AuditExportResult | null;
  children: ReactNode;
}) {
  const t = useTranslations("adminAudit.export");
  const locale = useLocale() as Locale;
  const [result, formAction, pending] = useActionState<AuditExportResult | null, FormData>(exportAuditLog, initial);

  useEffect(() => {
    if (result?.ok) window.location.assign(result.url);
  }, [result]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {children}
        <form action={formAction}>
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Button type="submit" variant="secondary" disabled={pending} aria-describedby={result && !result.ok ? "audit-export-result" : undefined}>
            {pending ? t("pending") : t("button")}
          </Button>
        </form>
      </div>
      {result && !result.ok ? (
        <Notice
          id="audit-export-result"
          role="status"
          tone={result.error === "preview" ? "info" : "warning"}
          title={t(`${result.error}.title`)}
          body={
            result.error === "preview"
              ? t("preview.body", { count: result.rows, countLabel: formatNumber(result.rows, locale) })
              : t(`${result.error}.body`)
          }
        />
      ) : null}
    </div>
  );
}
