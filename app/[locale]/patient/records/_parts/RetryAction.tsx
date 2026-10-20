"use client";
// The next action on a failed set (rules L3, L4: the reason, then the fix). A damaged page: upload that file again, checked
// here like any upload, then the set starts again from the failed page. A service failure: try again. Either way the quote is
// reused and nothing new is charged (task 3.8). Prototype: the stub answers ok and this says what would happen next.
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, FilePick } from "@/components/ui";
import { business, recordsLimits } from "@/config/business";
import { formatNumber, type Locale } from "@/lib/format";
import { RECORDS_ACCEPT, checkFile, fileKind, type FailureReason, type RejectReason } from "@/lib/records";
import { retryRecordSet } from "../actions";
import { DocumentIcon } from "./icons";
import { sizeMb } from "./labels";

export function RetryAction({ setId, reason, otherBytes }: { setId: string; reason: FailureReason; otherBytes: number }) {
  const t = useTranslations("recordSet.failed");
  const tf = useTranslations("records.file");
  const locale = useLocale() as Locale;
  const [rejected, setRejected] = useState<{ reason: RejectReason; sizeBytes: number } | null>(null);
  const [outcome, setOutcome] = useState<"started" | "error" | null>(null);
  const [pending, startTransition] = useTransition();
  const limits = { fileMb: formatNumber(recordsLimits.maxFileMb, locale), setGb: formatNumber(recordsLimits.maxSetGb, locale) };

  const retry = (replacement: { name: string; sizeBytes: number } | null) =>
    startTransition(async () => {
      const result = await retryRecordSet(setId, replacement);
      setOutcome(result.ok ? "started" : "error");
    });

  const onFiles = ([file]: File[]) => {
    if (!file) return;
    setOutcome(null);
    const why = checkFile({ name: file.name, kind: fileKind(file.name, file.type), sizeBytes: file.size }, otherBytes, []);
    setRejected(why ? { reason: why, sizeBytes: file.size } : null);
    if (!why) retry({ name: file.name, sizeBytes: file.size });
  };

  return (
    <div className="flex flex-col gap-2">
      {reason === "damaged" ? (
        <FilePick
          id="records-replace"
          label={t("upload")}
          accept={RECORDS_ACCEPT}
          variant="primary"
          icon={<DocumentIcon />}
          disabled={pending || outcome === "started"}
          onFiles={onFiles}
          className="w-full sm:w-auto sm:self-start"
        />
      ) : (
        <Button size="lg" disabled={pending || outcome === "started"} onClick={() => retry(null)} className="w-full sm:w-auto sm:self-start">
          {t("retry")}
        </Button>
      )}
      {rejected ? (
        <p role="alert" className="text-sm text-danger">
          {tf(`reason.${rejected.reason}`, { size: sizeMb(rejected.sizeBytes, locale), ...limits })}
        </p>
      ) : null}
      {outcome === "started" ? (
        <p role="status" className="rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-500">
          {t("stub")}
        </p>
      ) : outcome === "error" ? (
        <p role="alert" className="text-sm text-danger">
          {t("error", { email: business.supportEmail })}
        </p>
      ) : null}
    </div>
  );
}
