// The patient's record sets under the upload flow (screen 24), newest first. A ready set opens its summary (rule T1: view is
// the primary portal action); any other set opens its progress page (screen 25). With no sets, the empty state says what the
// list is, why it is empty and gives one action, back to Add files (rule L3).
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge, ChevronNext, EmptyState, LinkButton, Surface, type BadgeTone } from "@/components/ui";
import { formatDate, formatNumber, type Locale } from "@/lib/format";
import type { RecordSetStatus } from "@/lib/records";
import type { SampleRecordSet } from "@/lib/sample";
import { counted } from "./labels";

const TONE: Record<RecordSetStatus, BadgeTone> = {
  queued: "pending",
  processing: "info",
  failed: "danger",
  done: "success",
  cancelled: "pending",
};

export function SetList({
  sets,
  locale,
  timeZone,
  addHref,
}: {
  sets: SampleRecordSet[];
  locale: Locale;
  timeZone: string;
  /** Add files on this same page (keeps the prototype's ?state= so the preview does not reset). */
  addHref: React.ComponentProps<typeof Link>["href"];
}) {
  const t = useTranslations("records.sets");
  return (
    <section aria-labelledby="sets-title" className="mt-10">
      <h2 id="sets-title" className="text-xl font-bold text-sea-900 sm:text-2xl">
        {t("title")}
      </h2>
      <p className="mt-1 max-w-2xl text-ink-700">{t("lead")}</p>
      {sets.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={t("empty.title")} body={t("empty.body")} action={<LinkButton href={addHref}>{t("empty.action")}</LinkButton>} />
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {sets.map((set) => {
            const pages = set.files.flatMap((f) => f.pages);
            const done = pages.filter((p) => p.status === "read" || p.status === "unreadable").length;
            const unreadable = pages.filter((p) => p.status === "unreadable").length;
            const ready = set.status === "done" && set.summaryId;
            const detail =
              set.status === "processing"
                ? t("detail.processing", { done: formatNumber(done, locale), total: formatNumber(pages.length, locale) })
                : set.status === "done"
                  ? unreadable
                    ? t("detail.doneUnreadable", counted(unreadable, locale))
                    : t("detail.done")
                  : t(`detail.${set.status}`);
            return (
              <li key={set.id}>
                <Link href={ready ? `/patient/records/${set.id}/summary` : `/patient/records/${set.id}`} className="block rounded-[var(--radius-card)]">
                  <Surface className="flex items-center justify-between gap-3 hover:border-sea-500">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <h3 className="font-bold text-sea-900">{t("uploaded", { date: formatDate(set.createdAt, timeZone, locale) })}</h3>
                        <Badge tone={TONE[set.status]}>{t(`status.${set.status}`)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-700">
                        {t("counts", { files: t("files", counted(set.files.length, locale)), pages: t("pages", counted(pages.length, locale)) })}
                      </p>
                      <p className={set.status === "failed" ? "mt-0.5 text-sm font-semibold text-danger" : "mt-0.5 text-sm text-ink-900"}>{detail}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[15px] font-semibold text-sea-700">
                      <span className="hidden sm:inline">{ready ? t("openSummary") : t("openProgress")}</span>
                      <ChevronNext />
                    </span>
                  </Surface>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
