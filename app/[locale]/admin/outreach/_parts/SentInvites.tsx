"use client";
// The sent invites (screen 46): a table from lg up, stacked rows on phone, one state for both. Revoke applies at once and
// offers Undo in the bar instead of a confirmation (rule B10), like Stop sharing on screen 27. Resend is off until counsel
// clears sending (config/business.ts outreach.sendingCleared); the server action refuses it too. Expired, bounced and revoked
// rows link to the invite form instead, because a new invite needs a checked address. Claimed rows need nothing.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, LinkButton, Surface, Toast, ToastRegion } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { resendInvite, restoreInvite, revokeInvite, type InviteActionResult } from "../actions";
import { STATUS_TONE, type InviteRowView, type NowLabels } from "./types";

const TOAST_ID = "outreach-toast";
const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");

type ToastState = { message: string; undo?: InviteRowView };

export function SentInvites({
  initialRows,
  now,
  sendingCleared,
  gateId,
  caption,
}: {
  initialRows: InviteRowView[];
  now: NowLabels;
  sendingCleared: boolean;
  /** The id of the page's "sending is off" notice, which describes the disabled Resend buttons. */
  gateId: string;
  caption: string;
}) {
  const t = useTranslations("adminOutreach");
  const tc = useTranslations("common");
  const [rows, setRows] = useState(initialRows);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Focus never drops to the page when the button used goes away (Revoke, Undo): it moves to the bar.
  const focusToast = useRef(false);
  useEffect(() => {
    if (!focusToast.current) return;
    focusToast.current = false;
    document.getElementById(TOAST_ID)?.querySelector<HTMLElement>("button")?.focus();
  });

  const patch = (id: string, change: Partial<InviteRowView>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...change } : r)));
  const call = async (action: () => Promise<InviteActionResult>): Promise<InviteActionResult> => {
    try {
      return await action();
    } catch {
      return { ok: false, error: "unavailable" };
    }
  };
  const failure = (r: InviteActionResult) => (r.ok ? "" : r.error === "unavailable" ? t("toast.failed") : t(`errors.${r.error}`));

  async function revoke(row: InviteRowView) {
    patch(row.id, { status: "revoked", revoked: now.today, fresh: false });
    setToast({ message: t("toast.revoked", { name: row.name }), undo: row });
    focusToast.current = true;
    const result = await call(() => revokeInvite({ inviteId: row.id }));
    if (!result.ok) {
      patch(row.id, row);
      setToast({ message: failure(result) });
    }
  }

  async function undo() {
    const before = toast?.undo;
    if (!before) return;
    focusToast.current = true; // Undo goes away; Close in the same bar keeps the focus
    patch(before.id, before);
    setToast({ message: t("toast.restored", { name: before.name }) });
    const result = await call(() => restoreInvite({ inviteId: before.id }));
    if (!result.ok) {
      patch(before.id, { status: "revoked", revoked: now.today });
      setToast({ message: failure(result) });
    }
  }

  async function resend(row: InviteRowView) {
    setBusy(row.id);
    const result = await call(() => resendInvite({ inviteId: row.id }));
    setBusy(null);
    if (!result.ok) {
      setToast({ message: failure(result) });
      return;
    }
    patch(row.id, { status: "sent", sentOn: now.sentOn, sentDate: now.sentDate, sentTime: now.sentTime, expires: now.expires, opened: undefined, fresh: true });
    setToast({ message: t("toast.resent", { name: row.name }) });
  }

  const latest = (r: InviteRowView): string => {
    switch (r.status) {
      case "sent":
        return t(r.fresh ? "latest.justSent" : "latest.sent", { expires: r.expires });
      case "opened":
        return t("latest.opened", { date: r.opened ?? "", expires: r.expires });
      case "claimed":
        return t("latest.claimed", { date: r.claimed ?? "" });
      case "expired":
        return r.opened ? t("latest.expired", { date: r.expires, opened: r.opened }) : t("latest.expiredUnopened", { date: r.expires });
      case "bounced":
        return t(`latest.bounced.${r.bounce ?? "noMailbox"}`, { date: r.bounced ?? "" });
      case "revoked":
        return t("latest.revoked", { date: r.revoked ?? "" });
    }
  };

  // The visible label plus the doctor's name for screen readers, so ten "Resend" buttons are told apart (label in name).
  const named = (label: string, name: string) => (
    <>
      {label}
      <span className="sr-only">: {name}</span>
    </>
  );

  const actions = (r: InviteRowView) => {
    if (r.status === "sent" || r.status === "opened") {
      return (
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={!sendingCleared || busy === r.id}
            title={sendingCleared ? undefined : t("actions.off")}
            aria-describedby={sendingCleared ? undefined : gateId}
            onClick={() => resend(r)}
          >
            {named(t("actions.resend"), r.name)}
          </Button>
          <Button type="button" variant="ghost" onClick={() => revoke(r)}>
            {named(t("actions.revoke"), r.name)}
          </Button>
        </>
      );
    }
    if (r.status === "claimed") return null;
    return (
      <LinkButton href={r.composeHref} variant="secondary">
        {named(r.status === "bounced" ? t("actions.fixAddress") : t("actions.inviteAgain"), r.name)}
      </LinkButton>
    );
  };

  const doctor = (r: InviteRowView) => (
    <>
      <Link href={r.profileHref} className="font-semibold text-sea-800 underline-offset-2 hover:underline">
        {r.name}
      </Link>
      <p className="text-sm text-ink-700">{r.specialty}</p>
    </>
  );
  const email = (r: InviteRowView) => (
    <p className="text-sm text-ink-900">
      <span className="ltr-run max-w-full break-all">{r.email}</span>
    </p>
  );
  // The badge never wraps inside itself ("Not opened yet" stays one pill).
  const badge = (r: InviteRowView) => (
    <span className="inline-block whitespace-nowrap">
      <Badge tone={STATUS_TONE[r.status]}>{t(`status.${r.status}`)}</Badge>
    </span>
  );

  return (
    <>
      {/* Phone and tablet: one stacked row per invite. */}
      <Surface className="py-1 lg:hidden">
        <ul aria-label={caption} className="divide-y divide-sand-200">
          {rows.map((r) => {
            const a = actions(r);
            return (
              <li key={r.id} className={cx("flex flex-col gap-2 py-4", r.fresh && "-mx-5 bg-lagoon-100 px-5")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">{doctor(r)}</div>
                  <span className="shrink-0">{badge(r)}</span>
                </div>
                {email(r)}
                <p className="text-sm text-ink-700">
                  <span className="tabular">{t("sent.sentOn", { date: r.sentOn })}</span>
                  <br />
                  {latest(r)}
                </p>
                {a ? <div className="flex flex-wrap gap-2">{a}</div> : null}
              </li>
            );
          })}
        </ul>
      </Surface>

      {/* Desktop: the table. Status carries what happened last under the badge; the everyday actions sit in the row (A5). */}
      <Surface className="hidden py-2 lg:block">
        <table className="w-full border-collapse text-start">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-sand-300 text-sm text-ink-700">
              <th scope="col" className="w-[32%] py-3 pe-4 text-start font-semibold">
                {t("sent.columns.doctor")}
              </th>
              <th scope="col" className="py-3 pe-4 text-start font-semibold">
                {t("sent.columns.status")}
              </th>
              <th scope="col" className="py-3 pe-4 text-start font-semibold">
                {t("sent.columns.sent")}
              </th>
              <th scope="col" className="py-3 text-end font-semibold">
                <span className="sr-only">{t("sent.columns.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cx("border-b border-sand-200 align-top last:border-b-0", r.fresh && "bg-lagoon-100")}>
                <td className="py-4 pe-4">
                  {doctor(r)}
                  {email(r)}
                </td>
                <td className="py-4 pe-4">
                  {badge(r)}
                  <p className="mt-1.5 text-sm text-ink-700">{latest(r)}</p>
                </td>
                <td className="tabular py-4 pe-4 text-sm text-ink-700">
                  <span className="whitespace-nowrap">{r.sentDate}</span>
                  <br />
                  <span className="whitespace-nowrap">{r.sentTime}</span>
                </td>
                <td className="py-4">
                  <div className="flex justify-end gap-2 whitespace-nowrap">{actions(r)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>

      <ToastRegion>
        {toast ? (
          <Toast
            id={TOAST_ID}
            message={toast.message}
            actionLabel={toast.undo ? t("toast.undo") : undefined}
            onAction={toast.undo ? undo : undefined}
            dismissLabel={tc("close")}
            onDismiss={() => setToast(null)}
          />
        ) : null}
      </ToastRegion>
    </>
  );
}
