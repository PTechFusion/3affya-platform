"use client";
// Your data and Delete (screen 28). Download asks for one ZIP of everything and says where the link goes. Each deletion states
// what it removes and what retention keeps, with the periods from config/business.ts accountData (rule T8). Both deletions ask
// once, inline, with buttons that name the outcome (B10): uploads go at once; the account waits deletionGraceDays, and Keep my
// account (the banner, or Undo in the bar) cancels it until then. Without uploads, that row is the empty state with one action.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, CheckIcon, ChevronNext, EmptyState, LinkButton } from "@/components/ui";
import { accountData } from "@/config/business";
import { Link } from "@/i18n/navigation";
import { formatNumber, type Locale } from "@/lib/format";
import { deleteUploads, requestAccountDeletion, requestDataExport } from "../actions";
import { Group } from "./Group";
import { FOCUS, type When } from "./model";
import type { FocusLater, Notify } from "./SettingsScreen";

const unavailable = { ok: false as const, error: "unavailable" as const };

function useUnits() {
  const t = useTranslations("settings");
  const loc = useLocale() as Locale;
  return {
    days: (n: number) => t("units.days", { days: n, daysLabel: formatNumber(n, loc) }),
    years: (n: number) => t("units.years", { years: n, yearsLabel: formatNumber(n, loc) }),
  };
}

const address = (chunks: React.ReactNode) => <span className="ltr-run font-semibold text-ink-900">{chunks}</span>;
const nowrap = (chunks: React.ReactNode) => <span className="whitespace-nowrap">{chunks}</span>;

export function DataGroup({ email, initialRequested }: { email: string; initialRequested: boolean }) {
  const t = useTranslations("settings");
  const units = useUnits();
  const [requested, setRequested] = useState(initialRequested);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function request() {
    setPending(true);
    setFailed(false);
    const result = await requestDataExport().catch(() => unavailable);
    setPending(false);
    if (result.ok) setRequested(true);
    else setFailed(true);
  }

  return (
    <Group id="data" title={t("data.title")}>
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-bold text-ink-900">{t("data.downloadTitle")}</h3>
          <p className="mt-1 text-ink-700">{t("data.downloadBody")}</p>
        </div>
        {/* The live region stays mounted so the "preparing" message is announced when it appears. */}
        <div id={FOCUS.exportStatus} role="status" aria-live="polite">
          {requested ? (
            <div className="flex items-start gap-3 rounded-[var(--radius-field)] bg-lagoon-100 p-4">
              <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-success">
                <CheckIcon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{t("data.requestedTitle")}</p>
                <p className="mt-0.5 text-sm text-ink-700">
                  {t.rich("data.requestedBody", { email, days: units.days(accountData.exportAvailableDays), address })}
                </p>
              </div>
            </div>
          ) : null}
          {failed ? <p className="text-sm text-danger">{t("toast.failed")}</p> : null}
        </div>
        {requested ? null : (
          <Button type="button" variant="secondary" onClick={() => void request()} disabled={pending} className="w-full sm:w-auto sm:self-start">
            {pending ? t("data.preparing") : t("data.download")}
          </Button>
        )}
      </div>
      <Link href="/privacy#keep" className="inline-flex min-h-11 items-center gap-1 self-start font-semibold text-sea-700 hover:underline">
        {t("data.privacy")}
        <ChevronNext />
      </Link>
    </Group>
  );
}

/** What a deletion removes and what is kept, side by side from tablet width (rule T8). */
function Retention({ removed, kept }: { removed: string[]; kept: string[] }) {
  const t = useTranslations("settings");
  const list = (title: string, items: string[]) => (
    <div className="rounded-[var(--radius-field)] bg-sand-50 p-3">
      <h4 className="text-sm font-semibold text-ink-900">{title}</h4>
      <ul className="mt-1.5 list-disc space-y-1 ps-5 text-sm text-ink-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {list(t("delete.removed"), removed)}
      {list(t("delete.kept"), kept)}
    </div>
  );
}

/** The one question before an irreversible step: the outcome in the title and on both buttons (rule B10). */
function Confirm({
  id,
  title,
  body,
  extra,
  confirmLabel,
  keepLabel,
  busy,
  busyLabel,
  onConfirm,
  onKeep,
}: {
  id: string;
  title: string;
  body: React.ReactNode;
  extra?: React.ReactNode;
  confirmLabel: string;
  keepLabel: string;
  busy: boolean;
  busyLabel: string;
  onConfirm: () => void;
  onKeep: () => void;
}) {
  return (
    <div role="group" aria-labelledby={id} className="mt-4 rounded-[var(--radius-field)] border border-danger bg-white p-4">
      <h4 id={id} tabIndex={-1} className="text-lg font-bold text-ink-900">
        {title}
      </h4>
      <p className="mt-1 text-ink-700">{body}</p>
      {extra}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onKeep} disabled={busy}>
          {keepLabel}
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </Button>
      </div>
    </div>
  );
}

export function DeleteGroup({
  initialHasUploads,
  initialUploadsConfirm,
  initialAccountConfirm,
  deleteOn,
  scheduled,
  onDeletionRequested,
  notify,
  focusLater,
}: {
  initialHasUploads: boolean;
  initialUploadsConfirm: boolean;
  initialAccountConfirm: boolean;
  deleteOn: When;
  scheduled: When | null;
  onDeletionRequested: () => void;
  notify: Notify;
  focusLater: FocusLater;
}) {
  const t = useTranslations("settings");
  const units = useUnits();
  const [hasUploads, setHasUploads] = useState(initialHasUploads);
  const [uploadsConfirm, setUploadsConfirm] = useState(initialUploadsConfirm && initialHasUploads);
  const [accountConfirm, setAccountConfirm] = useState(initialAccountConfirm);
  const [busy, setBusy] = useState<"uploads" | "account" | null>(null);

  const years = units.years(accountData.paymentRecordsKeepYears);
  const backups = units.days(accountData.backupRollOffDays);

  async function removeUploads() {
    setBusy("uploads");
    const result = await deleteUploads().catch(() => unavailable);
    setBusy(null);
    if (!result.ok) {
      notify(t("toast.failed"));
      return;
    }
    setUploadsConfirm(false);
    setHasUploads(false);
    notify(t("toast.uploadsDeleted")); // no Undo: the files are gone, which is why it asked first
    focusLater(FOCUS.uploadRecords);
  }

  async function removeAccount() {
    setBusy("account");
    const result = await requestAccountDeletion().catch(() => unavailable);
    setBusy(null);
    if (!result.ok) {
      notify(t("toast.failed"));
      return;
    }
    setAccountConfirm(false);
    onDeletionRequested();
  }

  return (
    <Group id="delete" tone="danger" title={t("delete.title")} lead={t("delete.lead")}>
      <div className="divide-y divide-sand-200">
        <article aria-labelledby="settings-delete-uploads-title" className="pb-5">
          <h3 id="settings-delete-uploads-title" className="text-lg font-bold text-ink-900">
            {t("delete.uploads.title")}
          </h3>
          {hasUploads ? (
            <>
              <p className="mt-1 text-ink-700">{t("delete.uploads.body")}</p>
              <Retention
                removed={[t("delete.uploads.removed1"), t("delete.uploads.removed2"), t("delete.uploads.removed3")]}
                kept={[t("delete.uploads.kept1"), t("delete.uploads.kept2", { years }), t("delete.uploads.kept3", { days: backups })]}
              />
              {uploadsConfirm ? (
                <Confirm
                  id={FOCUS.uploadsConfirm}
                  title={t("delete.uploads.confirmTitle")}
                  body={t("delete.uploads.confirmBody")}
                  confirmLabel={t("delete.uploads.confirm")}
                  keepLabel={t("delete.uploads.keep")}
                  busy={busy === "uploads"}
                  busyLabel={t("delete.uploads.deleting")}
                  onConfirm={() => void removeUploads()}
                  onKeep={() => {
                    setUploadsConfirm(false);
                    focusLater(FOCUS.deleteUploads);
                  }}
                />
              ) : (
                <Button
                  id={FOCUS.deleteUploads}
                  type="button"
                  variant="secondary"
                  className="mt-4 w-full sm:w-auto"
                  onClick={() => {
                    setUploadsConfirm(true);
                    focusLater(FOCUS.uploadsConfirm);
                  }}
                >
                  {t("delete.uploads.action")}
                </Button>
              )}
            </>
          ) : (
            <div className="mt-3">
              <EmptyState
                title={t("delete.uploads.emptyTitle")}
                body={t("delete.uploads.emptyBody")}
                action={
                  <LinkButton id={FOCUS.uploadRecords} href="/patient/records" variant="secondary">
                    {t("delete.uploads.emptyAction")}
                  </LinkButton>
                }
              />
            </div>
          )}
        </article>

        <article aria-labelledby="settings-delete-account-title" className="pt-5">
          <h3 id="settings-delete-account-title" className="text-lg font-bold text-ink-900">
            {t("delete.account.title")}
          </h3>
          <p className="mt-1 text-ink-700">{t("delete.account.body", { days: units.days(accountData.deletionGraceDays) })}</p>
          <Retention
            removed={[t("delete.account.removed1"), t("delete.account.removed2"), t("delete.account.removed3")]}
            kept={[t("delete.account.kept1", { years }), t("delete.account.kept2"), t("delete.account.kept3", { days: backups })]}
          />
          <p className="mt-3 text-sm text-ink-700">{t("delete.account.doctorNotes")}</p>
          {scheduled ? (
            <p className="mt-4 font-semibold text-ink-900">{t.rich("delete.account.scheduled", { day: scheduled.day, time: scheduled.time, nowrap })}</p>
          ) : accountConfirm ? (
            <Confirm
              id={FOCUS.accountConfirm}
              title={t("delete.account.confirmTitle")}
              body={t.rich("delete.account.confirmBody", { day: deleteOn.day, time: deleteOn.time, nowrap })}
              extra={
                <p className="mt-2 text-sm text-ink-700">
                  {t.rich("delete.account.confirmVisits", {
                    link: (chunks) => (
                      <Link href="/refunds" className="font-semibold text-sea-700 underline underline-offset-2">
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              }
              confirmLabel={t("delete.account.confirm")}
              keepLabel={t("delete.account.keep")}
              busy={busy === "account"}
              busyLabel={t("delete.account.asking")}
              onConfirm={() => void removeAccount()}
              onKeep={() => {
                setAccountConfirm(false);
                focusLater(FOCUS.deleteAccount);
              }}
            />
          ) : (
            <Button
              id={FOCUS.deleteAccount}
              type="button"
              variant="secondary"
              className="mt-4 w-full sm:w-auto"
              onClick={() => {
                setAccountConfirm(true);
                focusLater(FOCUS.accountConfirm);
              }}
            >
              {t("delete.account.action")}
            </Button>
          )}
        </article>
      </div>
    </Group>
  );
}
