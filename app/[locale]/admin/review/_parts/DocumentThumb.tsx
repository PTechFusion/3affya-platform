"use client";
// One uploaded credential or the profile photo as a thumbnail that opens a viewer (layout call: documents as thumbnails
// opening in a viewer). The viewer is the shared Sheet. The prototype stores file names only, never files (builder.json), so a
// document shows a page outline and says so; the photo shows the image. Production opens the file from the private
// credentials bucket through a short-lived signed URL (architecture: Storage).
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Notice, Sheet } from "@/components/ui";

export type ThumbFile = { id: string; name: string; kindLabel: string; sizeLabel?: string; uploadedLabel?: string; imageUrl?: string };

/** Decorative page lines for a document that has no preview. */
function PageOutline({ lines = 5 }: { lines?: number }) {
  return (
    <span aria-hidden="true" className="flex h-full flex-col gap-2 p-3">
      <span className="block h-2 w-1/2 rounded-full bg-sand-400" />
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={["block h-1.5 rounded-full bg-sand-300", i % 3 === 2 ? "w-2/3" : "w-full"].join(" ")} />
      ))}
    </span>
  );
}

export function DocumentThumb({ file }: { file: ThumbFile }) {
  const t = useTranslations("adminReview.viewer");
  const tc = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);
  const ext = file.imageUrl ? "" : (file.name.split(".").pop() ?? "").toUpperCase();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
        className="flex w-36 shrink-0 flex-col gap-1.5 rounded-[var(--radius-field)] border border-sand-300 bg-white p-2 text-start transition-colors hover:border-lagoon-600"
      >
        <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-field)] bg-sand-100">
          {file.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <PageOutline lines={3} />
          )}
          {ext ? (
            <span className="ltr-run absolute bottom-1.5 end-1.5 rounded-[var(--radius-tag)] bg-sea-900 px-2 py-0.5 text-xs font-semibold text-white">{ext}</span>
          ) : null}
        </span>
        <span className="sr-only">{t("open")}</span>
        {/* The file name is its own isolate (rule R3): a Latin name keeps its order inside an Arabic line. Two lines at most. */}
        <span className="line-clamp-2 w-full break-all text-sm font-semibold leading-snug text-sea-800">
          <bdi>{file.name}</bdi>
        </span>
        {file.kindLabel || file.sizeLabel ? (
          <span className="block text-xs text-ink-500">
            {file.kindLabel}
            {file.kindLabel && file.sizeLabel ? " · " : null}
            {file.sizeLabel ? <span className="tabular">{file.sizeLabel}</span> : null}
          </span>
        ) : null}
      </button>
      <Sheet ref={ref} id={`viewer-${file.id}`} title={file.name} closeLabel={tc("close")}>
        <div className="flex flex-col gap-4">
          <div className="mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-[var(--radius-field)] border border-sand-300 bg-white">
            {file.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={file.imageUrl} alt={t("photoAlt")} className="size-full object-cover" />
            ) : (
              <PageOutline lines={12} />
            )}
          </div>
          {file.imageUrl ? null : <Notice tone="info" body={t("prototype")} />}
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
            {file.kindLabel ? (
              <>
                <dt className="text-ink-500">{t("kind")}</dt>
                <dd className="text-ink-900">{file.kindLabel}</dd>
              </>
            ) : null}
            {file.sizeLabel ? (
              <>
                <dt className="text-ink-500">{t("size")}</dt>
                <dd className="tabular text-ink-900">{file.sizeLabel}</dd>
              </>
            ) : null}
            {file.uploadedLabel ? (
              <>
                <dt className="text-ink-500">{t("uploaded")}</dt>
                <dd className="text-ink-900">{file.uploadedLabel}</dd>
              </>
            ) : null}
          </dl>
        </div>
      </Sheet>
    </>
  );
}
