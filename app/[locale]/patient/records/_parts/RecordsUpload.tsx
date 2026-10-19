"use client";
// Screen 24's upload flow (task 3.7): dropzone with the camera first on phone (rule T10), the file list with a per-file status
// and the exact reason and fix for any file not accepted (rule L4), the quote that updates as files land (the hook; one all-in
// number, rule C5), then the two separate consents, privacy and AI processing with the where-stored line (rules T3, Q3), and
// Pay, which hands off to Stripe's hosted page. Nothing is processed before payment (task 3.7).
// Prototype: files never leave the browser. Type and size are checked here; a PDF is read locally to count its pages and to
// spot a password lock. The real flow uploads through signed URLs and records.validate does these checks on the server.
import { useActionState, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge, Button, CheckCard, CloseIcon, FilePick, IconButton, Surface, Toast, ToastRegion, type BadgeTone } from "@/components/ui";
import { business, recordsLimits } from "@/config/business";
import { formatMoney, formatNumber, type Locale } from "@/lib/format";
import { RECORDS_ACCEPT, checkFile, fileKind, quoteFor, type DraftFile, type RecordFileKind } from "@/lib/records";
import { startRecordsCheckout, type CheckoutResult } from "../actions";
import { CameraIcon, DocumentIcon, PhotoIcon } from "./icons";
import { counted, isolate, sizeMb } from "./labels";

type Consent = { privacy: boolean; ai: boolean };
type ConsentErrors = { privacy?: boolean; ai?: boolean };

/** The starting point of the flow. The page builds it from ?state= (validating, rejected, quote, consent, paying). */
export type UploadPreview = { files: DraftFile[]; consent: Consent; errors: ConsentErrors; paying: boolean };

const STATUS_TONE: Record<DraftFile["status"], BadgeTone> = { checking: "info", accepted: "success", rejected: "danger" };
// Long enough that "Checking" is seen to happen, so the quote visibly updates as each file lands (rule L2: the row appears at once).
const MIN_CHECK_MS = 700;

/** Pages and password lock, read on this device. Photos are one page; Word files are counted after upload (null). */
async function inspect(file: File, kind: RecordFileKind): Promise<{ pages: number | null; encrypted: boolean }> {
  if (kind === "jpg" || kind === "png") return { pages: 1, encrypted: false };
  if (kind !== "pdf") return { pages: null, encrypted: false };
  const text = new TextDecoder("latin1").decode(await file.arrayBuffer());
  const pages = (text.match(/\/Type\s*\/Page(?![A-Za-z])/g) ?? []).length;
  return { pages: pages > 0 ? pages : null, encrypted: /\/Encrypt\b/.test(text) };
}

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");

export function RecordsUpload({ preview, progressHref }: { preview: UploadPreview; progressHref: string }) {
  const t = useTranslations("records");
  const locale = useLocale() as Locale;
  const [files, setFiles] = useState<DraftFile[]>(preview.files);
  const [consent, setConsent] = useState<Consent>(preview.consent);
  const [errors, setErrors] = useState<ConsentErrors>(preview.errors);
  const [dragging, setDragging] = useState(false);
  const [removed, setRemoved] = useState<{ file: DraftFile; index: number } | null>(null);
  const [result, formAction, pending] = useActionState<CheckoutResult | null, FormData>(startRecordsCheckout, null);
  const nextId = useRef(0);

  useEffect(() => {
    if (result?.ok) window.location.assign(result.url);
  }, [result]);

  // Prototype: the stub answers "preview", which stands for the hand-off to Stripe's page.
  const handedOff = preview.paying || (result !== null && !result.ok && result.error === "preview");
  const serverError = result && !result.ok && result.error !== "preview" ? result.error : null;
  const locked = handedOff || pending;

  const accepted = files.filter((f) => f.status === "accepted");
  const checkingCount = files.filter((f) => f.status === "checking").length;
  const rejectedCount = files.filter((f) => f.status === "rejected").length;
  const acceptedBytes = accepted.reduce((n, f) => n + f.sizeBytes, 0);
  const quote = quoteFor(acceptedBytes);
  const pages = accepted.reduce((n, f) => n + (f.pages ?? 0), 0);
  const uncounted = accepted.some((f) => f.pages === null);

  const money = (cents: number) => formatMoney(cents, business.currencyPresentment, locale);
  const price = money(quote.totalCents);
  const limits = { fileMb: formatNumber(recordsLimits.maxFileMb, locale), setGb: formatNumber(recordsLimits.maxSetGb, locale) };
  const block = { price: money(business.recordsBlockPriceCents), gb: formatNumber(business.recordsBlockGb, locale) };

  function addFiles(list: File[]) {
    if (locked || !list.length) return;
    setRemoved(null);
    const inSet = files.filter((f) => f.status !== "rejected");
    let bytes = inSet.reduce((n, f) => n + f.sizeBytes, 0);
    const added: Array<{ item: DraftFile; file: File }> = [];
    for (const file of list) {
      const kind = fileKind(file.name, file.type);
      const others = [...inSet, ...added.filter((a) => a.item.status !== "rejected").map((a) => a.item)];
      const reason = checkFile({ name: file.name, kind, sizeBytes: file.size }, bytes, others);
      if (!reason) bytes += file.size;
      const item: DraftFile = { id: `new_${nextId.current++}`, name: file.name, kind, sizeBytes: file.size, pages: null, status: reason ? "rejected" : "checking" };
      if (reason) item.reason = reason;
      added.push({ item, file });
    }
    setFiles((prev) => [...prev, ...added.map((a) => a.item)]);
    for (const { item, file } of added) {
      if (item.status !== "checking") continue;
      const started = Date.now();
      inspect(file, item.kind)
        .catch(() => null)
        .then((found) => {
          window.setTimeout(
            () =>
              setFiles((prev) =>
                prev.map((f) => {
                  if (f.id !== item.id) return f;
                  if (!found) return { ...f, status: "rejected", reason: "empty" };
                  if (found.encrypted) return { ...f, status: "rejected", reason: "encrypted" };
                  return { ...f, status: "accepted", pages: found.pages };
                }),
              ),
            Math.max(0, MIN_CHECK_MS - (Date.now() - started)),
          );
        });
    }
  }

  function remove(id: string) {
    const index = files.findIndex((f) => f.id === id);
    const file = files[index];
    if (!file) return;
    setFiles((prev) => prev.filter((f) => f.id !== id));
    // A file still being checked comes back without its result, so it is removed without an undo.
    setRemoved(file.status === "checking" ? null : { file, index });
  }

  function undo() {
    if (!removed) return;
    const { file, index } = removed;
    setFiles((prev) => [...prev.slice(0, index), file, ...prev.slice(index)]);
    setRemoved(null);
  }

  function toggle(key: keyof Consent, value: boolean) {
    setConsent((prev) => ({ ...prev, [key]: value }));
    if (value) setErrors((prev) => ({ ...prev, [key]: false })); // rule F4: the error clears the moment it is fixed
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const missing = { privacy: !consent.privacy, ai: !consent.ai };
    if (!missing.privacy && !missing.ai) return;
    e.preventDefault();
    setErrors(missing);
    document.getElementById(missing.privacy ? "consent-privacy" : "consent-ai")?.focus();
  }

  const tally = [
    accepted.length ? t("file.tally.accepted", counted(accepted.length, locale)) : null,
    checkingCount ? t("file.tally.checking", counted(checkingCount, locale)) : null,
    rejectedCount ? t("file.tally.rejected", counted(rejectedCount, locale)) : null,
  ].filter(Boolean);

  const where = recordsLimits.storageCountry
    ? t("consent.whereStored", { country: t(`consent.country.${recordsLimits.storageCountry}`) })
    : t("consent.whereStoredPending");

  const fileMeta = (f: DraftFile) => {
    const parts = [t(`file.kind.${f.kind}`), t("file.size", { size: sizeMb(f.sizeBytes, locale) })];
    if (f.status === "accepted") parts.push(f.pages === null ? t("file.pagesLater") : t("file.pages", counted(f.pages, locale)));
    // Each part is isolated (rule R3) so "PDF" and "4.7 MB" keep their own order inside an Arabic line.
    return parts.map(isolate).join(t("file.sep"));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <Surface className="flex flex-col gap-5">
        <section id="add-files" aria-labelledby="add-files-title">
          <h2 id="add-files-title" className="text-xl font-bold text-sea-900">
            {t("upload.title")}
          </h2>
          <div
            onDragOver={(e) => {
              if (locked || !e.dataTransfer.types.includes("Files")) return;
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(Array.from(e.dataTransfer.files));
            }}
            className={cx(
              "mt-3 flex flex-col items-center gap-3 rounded-[var(--radius-field)] border-2 border-dashed px-4 py-5 text-center transition-colors",
              dragging ? "border-lagoon-600 bg-lagoon-100" : "border-sand-300 bg-sand-50",
            )}
          >
            {/* Phone: the camera first (photos of paper reports are the common case), then files. Wider screens: files only. */}
            <div className="flex w-full flex-col gap-2 sm:hidden">
              <FilePick
                id="records-camera"
                label={t("upload.camera")}
                accept="image/jpeg,image/png"
                capture="environment"
                variant="primary"
                icon={<CameraIcon />}
                describedBy="records-formats"
                disabled={locked}
                onFiles={addFiles}
                className="w-full"
              />
              <FilePick
                id="records-choose-phone"
                label={files.length ? t("upload.chooseMore") : t("upload.choose")}
                accept={RECORDS_ACCEPT}
                multiple
                icon={<DocumentIcon />}
                describedBy="records-formats"
                disabled={locked}
                onFiles={addFiles}
                className="w-full"
              />
            </div>
            <div className="hidden flex-col items-center gap-2 sm:flex">
              <FilePick
                id="records-choose"
                label={files.length ? t("upload.chooseMore") : t("upload.choose")}
                accept={RECORDS_ACCEPT}
                multiple
                variant="primary"
                icon={<DocumentIcon />}
                describedBy="records-formats"
                disabled={locked}
                onFiles={addFiles}
              />
              <p className="text-sm text-ink-700">{dragging ? t("upload.dropNow") : t("upload.drag")}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p id="records-formats" className="text-sm font-semibold text-ink-900">
                {t("upload.formats", limits)}
              </p>
              <p className="text-sm text-ink-700">{t("upload.photoTip")}</p>
            </div>
          </div>
          <p className="mt-2 rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-500">
            {t("upload.prototype")}
          </p>
        </section>

        {files.length ? (
          <section aria-labelledby="files-title">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 id="files-title" className="font-bold text-ink-900">
                {t("file.listTitle")}
              </h3>
              <p aria-live="polite" className="text-sm text-ink-700">
                {tally.join(t("file.sep"))}
              </p>
            </div>
            <ul className="mt-2 divide-y divide-sand-200 border-y border-sand-200">
              {files.map((f) => (
                <li key={f.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-sand-100 text-sea-700">
                    {f.kind === "jpg" || f.kind === "png" ? <PhotoIcon /> : <DocumentIcon />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* The name keeps its own direction (rule R3) and wraps anywhere; the line itself follows the page. */}
                    <span className="block break-all font-semibold text-ink-900">
                      <bdi>{f.name}</bdi>
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge tone={STATUS_TONE[f.status]}>{t(`file.status.${f.status}`)}</Badge>
                      <span className="tabular text-sm text-ink-700">{fileMeta(f)}</span>
                    </div>
                    {f.status === "rejected" && f.reason ? (
                      <p className="mt-1.5 text-sm text-danger">
                        {t(`file.reason.${f.reason}`, { size: sizeMb(f.sizeBytes, locale), ...limits })}
                      </p>
                    ) : null}
                  </div>
                  <IconButton label={t("file.remove", { name: f.name })} onClick={() => remove(f.id)} disabled={locked}>
                    <CloseIcon className="size-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Surface>

      <Surface className="flex flex-col gap-5 lg:sticky lg:top-24">
        <section aria-labelledby="quote-title">
          <h2 id="quote-title" className="text-xl font-bold text-sea-900">
            {t("quote.title")}
          </h2>
          {accepted.length || checkingCount ? (
            <>
              <dl className="mt-3 divide-y divide-sand-200 border-y border-sand-200">
                {[
                  { term: t("quote.files"), value: formatNumber(accepted.length, locale) },
                  { term: t("quote.pages"), value: formatNumber(pages, locale) },
                  { term: t("quote.size"), value: t("file.size", { size: sizeMb(acceptedBytes, locale) }) },
                ].map((row) => (
                  <div key={row.term} className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="text-ink-700">{row.term}</dt>
                    <dd className="tabular font-semibold text-ink-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <div aria-live="polite" className="mt-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-bold text-ink-900">{t("quote.total")}</span>
                  <span className="tabular text-2xl font-bold text-sea-900">{price}</span>
                </div>
                <p className="mt-1 text-sm text-ink-700">
                  {checkingCount
                    ? t("quote.updating")
                    : t("quote.blocks", { ...counted(quote.blocks, locale), gb: block.gb, price: block.price })}
                </p>
              </div>
              <ul className="mt-3 flex flex-col gap-1 text-sm text-ink-700">
                <li>{t("quote.rule", block)}</li>
                {quote.blocks > 0 && !checkingCount ? <li>{t("quote.room", { size: sizeMb(quote.roomBytes, locale) })}</li> : null}
                {uncounted ? <li>{t("quote.wordPages")}</li> : null}
                {rejectedCount ? <li>{t("quote.rejected", counted(rejectedCount, locale))}</li> : null}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-ink-700">{rejectedCount ? t("quote.noneAccepted") : t("quote.none", block)}</p>
          )}
        </section>

        {files.length ? (
          <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <input type="hidden" name="files" value={accepted.length} />
            <fieldset disabled={locked} className="min-w-0">
              <legend className="font-bold text-ink-900">{t("consent.legend")}</legend>
              <p className="mt-0.5 text-sm text-ink-700">{t("consent.lead")}</p>
              <div className="mt-3 flex flex-col gap-4">
                <div>
                  <CheckCard
                    id="consent-privacy"
                    name="privacy"
                    checked={consent.privacy}
                    onChange={(e) => toggle("privacy", e.currentTarget.checked)}
                    title={t("consent.privacy")}
                    description={t("consent.privacyHint")}
                    aria-invalid={errors.privacy || undefined}
                    aria-describedby={errors.privacy ? "consent-privacy-error" : undefined}
                  />
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="mt-1 inline-flex min-h-8 items-center text-sm font-semibold text-sea-700 underline underline-offset-2"
                  >
                    {t("consent.privacyLink")}
                  </Link>
                  {errors.privacy ? (
                    <p id="consent-privacy-error" role="alert" className="text-sm text-danger">
                      {t("consent.errorPrivacy")}
                    </p>
                  ) : null}
                </div>
                <div>
                  <CheckCard
                    id="consent-ai"
                    name="ai"
                    checked={consent.ai}
                    onChange={(e) => toggle("ai", e.currentTarget.checked)}
                    title={t("consent.ai")}
                    description={t("consent.aiHint")}
                    aria-invalid={errors.ai || undefined}
                    aria-describedby={cx("consent-where", errors.ai && "consent-ai-error")}
                  />
                  <div id="consent-where" className="mt-2 rounded-[var(--radius-field)] bg-sand-100 px-3 py-2.5 text-sm">
                    <p className="font-semibold text-ink-900">{t("consent.whereTitle")}</p>
                    <ul className="mt-1 flex flex-col gap-0.5 text-ink-700">
                      <li>{where}</li>
                      <li>{t("consent.whereRead", { country: t(`consent.country.${recordsLimits.aiCountry}`) })}</li>
                      <li>{t("consent.whereOpened")}</li>
                    </ul>
                  </div>
                  {errors.ai ? (
                    <p id="consent-ai-error" role="alert" className="mt-1.5 text-sm text-danger">
                      {t("consent.errorAi")}
                    </p>
                  ) : null}
                </div>
              </div>
            </fieldset>

            {handedOff ? (
              <div className="flex flex-col gap-2">
                <div role="status" className="rounded-[var(--radius-field)] border border-sea-500/40 bg-sea-100 p-4">
                  <p className="font-semibold text-sea-900">{t("pay.paying")}</p>
                  <p className="mt-1 text-sm text-ink-900">{t("pay.payingBody", { price })}</p>
                </div>
                <p className="rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-sm text-ink-500">
                  {t("pay.stub")}{" "}
                  <Link href={progressHref} className="font-semibold text-sea-700 underline underline-offset-2">
                    {t("pay.stubNext")}
                  </Link>
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button type="submit" size="lg" disabled={pending || checkingCount > 0 || !accepted.length} aria-describedby="pay-hint" className="w-full">
                  {pending ? t("pay.pending") : accepted.length ? t("pay.button", { price }) : t("pay.buttonNoFiles")}
                </Button>
                <p id="pay-hint" className="text-sm text-ink-700">
                  {checkingCount ? t("pay.wait") : accepted.length ? t("pay.hint") : t("pay.noFiles")}
                </p>
                {serverError ? (
                  <p role="alert" className="text-sm text-danger">
                    {t(`pay.error.${serverError}`, { email: business.supportEmail })}
                  </p>
                ) : null}
              </div>
            )}
          </form>
        ) : null}
      </Surface>

      <ToastRegion>
        {removed ? (
          <Toast
            message={t("file.removed", { name: isolate(removed.file.name) })}
            actionLabel={t("file.undo")}
            onAction={undo}
            dismissLabel={t("file.dismiss")}
            onDismiss={() => setRemoved(null)}
          />
        ) : null}
      </ToastRegion>
    </div>
  );
}
