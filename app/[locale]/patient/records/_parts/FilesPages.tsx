// Files and pages on the progress page (screen 25): each file with one dot per page, numbered across the set so "page 4 of
// 12" points at a dot. A page that could not be read says so with its page reference, why, and the fix (CLAUDE.md: flagged
// "unreadable" with the page reference, never guessed; rule L4). Each dot's state is in text for screen readers, and the
// legend names the states shown, so colour is never the only cue.
import { useTranslations } from "next-intl";
import { formatNumber, type Locale } from "@/lib/format";
import type { PageStatus } from "@/lib/records";
import type { RecordFile } from "@/lib/sample";
import { AlertIcon, DocumentIcon, PhotoIcon } from "./icons";
import { counted, isolate, sizeMb } from "./labels";
import type { PageView } from "./progress";

const DOT: Record<PageStatus, string> = {
  read: "bg-sea-100 text-sea-900",
  reading: "bg-white text-lagoon-900 ring-2 ring-lagoon-500 motion-safe:animate-pulse",
  waiting: "bg-white text-ink-500 ring-1 ring-sand-300",
  unreadable: "bg-gold-100 text-gold-700 ring-2 ring-gold-500",
  failed: "bg-danger text-white",
  notRead: "border border-dashed border-sand-400 bg-sand-100 text-ink-500",
};
const ORDER: PageStatus[] = ["read", "reading", "waiting", "unreadable", "failed", "notRead"];

export function FilesPages({ files, pages, locale, className }: { files: RecordFile[]; pages: PageView[]; locale: Locale; className?: string }) {
  const t = useTranslations("recordSet.files");
  const tr = useTranslations("records.file");
  const shown = ORDER.filter((s) => pages.some((p) => p.status === s));
  const sep = tr("sep");

  const ref = (p: PageView) =>
    p.file.pages.length > 1 && p.n !== p.filePage
      ? t("refInFile", { page: formatNumber(p.n, locale), filePage: formatNumber(p.filePage, locale) })
      : t("ref", { page: formatNumber(p.n, locale) });

  return (
    <section id="files" aria-labelledby="files-title" className={className}>
      <h2 id="files-title" className="text-xl font-bold text-sea-900">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-ink-700">{t("lead")}</p>
      <ul aria-label={t("legend")} className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-700">
        {shown.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-4 rounded-full ${DOT[s].replace("motion-safe:animate-pulse", "")}`} />
            {t(`status.${s}`)}
          </li>
        ))}
      </ul>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 sm:items-start">
        {files.map((file) => {
          const own = pages.filter((p) => p.file.id === file.id);
          const issues = own.filter((p) => p.status === "unreadable" || p.status === "failed");
          return (
            <li key={file.id} className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-sand-100 text-sea-700">
                  {file.kind === "jpg" || file.kind === "png" ? <PhotoIcon /> : <DocumentIcon />}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block break-all font-semibold text-ink-900">
                    <bdi>{file.name}</bdi>
                  </span>
                  <p className="tabular text-sm text-ink-700">
                    {[tr(`kind.${file.kind}`), tr("size", { size: sizeMb(file.sizeBytes, locale) }), tr("pages", counted(file.pages.length, locale))]
                      .map(isolate)
                      .join(sep)}
                  </p>
                </div>
              </div>
              <ol aria-label={t("pagesOf", { file: file.name })} className="mt-3 flex flex-wrap gap-1.5">
                {own.map((p) => (
                  <li
                    key={p.n}
                    className={`tabular flex size-8 items-center justify-center rounded-full text-sm font-semibold ${DOT[p.status]}`}
                  >
                    <span aria-hidden="true">{formatNumber(p.n, locale)}</span>
                    <span className="sr-only">{t("pageState", { page: formatNumber(p.n, locale), state: t(`status.${p.status}`) })}</span>
                  </li>
                ))}
              </ol>
              {issues.length ? (
                <ul className="mt-3 flex flex-col gap-2 border-t border-sand-200 pt-3">
                  {issues.map((p) => (
                    <li key={p.n} className="flex items-start gap-2 text-sm">
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${p.status === "failed" ? "bg-danger text-white" : "bg-gold-100 text-gold-700"}`}
                      >
                        <AlertIcon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900">{ref(p)}</p>
                        <p className="text-ink-700">
                          {p.status === "failed" ? t("failedNote") : `${t(`unreadable.${p.reason ?? "blurry"}`)} ${t(`fix.${p.reason ?? "blurry"}`)}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
