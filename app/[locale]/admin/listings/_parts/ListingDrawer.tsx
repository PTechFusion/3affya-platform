"use client";
// The edit drawer of a listing (screen 39): the Sheet primitive, opened from the URL (?edit=<id>) so it survives a reload and
// can be shared; closing it goes back to the list with the same filters. Most used first (rule A5): the status and what it
// means, what patients see (the one DoctorCard, rule U1), the details, then the edit form, then suspend at the very end.
// Edits and unsuspend are routine and reversible, so they apply at once and the list offers Undo (rule B10). Suspend hides a
// verified doctor from patients, so it asks once, with a reason for the audit log and buttons that name the outcomes.
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Badge, Button, Field, Input, LinkButton, Notice, Select, Sheet, Textarea } from "@/components/ui";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { saveListing, suspendListing, undoListingChange, unsuspendListing } from "../actions";
import { checkNameAr, checkReason, LISTING_LIMITS, type NameArError, type ReasonError } from "./validation";
import type { Change } from "./listings";
import type { DrawerView, SpecialtyOption } from "./types";

const SHEET_ID = "listing-drawer";
const FORM_ID = "listing-edit-form";

export function ListingDrawer({
  view,
  closeHref,
  listParams,
  change,
  confirmOnLoad,
  specialtyOptions,
}: {
  view: DrawerView;
  /** The list with the same filters, without the drawer. */
  closeHref: string;
  /** The list's query string (filters and the prototype switches), for the URL each action lands on. */
  listParams: string;
  /** The change the URL lays over this row, if any: acting against it is its Undo. */
  change: Change | null;
  /** ?confirm=suspend opens the suspend confirmation on load, so it can be reviewed from a URL. */
  confirmOnLoad: boolean;
  specialtyOptions: SpecialtyOption[];
}) {
  const t = useTranslations("adminListings.drawer");
  const tc = useTranslations("common");
  const router = useRouter();
  const sheetRef = useRef<HTMLDialogElement>(null);
  const leaving = useRef(false);

  useEffect(() => {
    sheetRef.current?.showModal();
  }, []);

  const land = (params: Record<string, string>) => {
    const p = new URLSearchParams(listParams);
    for (const [k, v] of Object.entries(params)) p.set(k, v);
    leaving.current = true;
    sheetRef.current?.close();
    router.replace(`/admin/listings?${p.toString()}`, { scroll: false });
  };
  const onClose = () => {
    if (!leaving.current) router.replace(closeHref, { scroll: false });
  };
  /** The inverse of the change the URL shows for this row is its Undo, so the stub checks it against the row before the change. */
  const undoes = (kind: Change["kind"]) => change?.id === view.id && change.kind === kind;

  /* ---------------- Edit ---------------- */
  const [nameAr, setNameAr] = useState(view.nameAr);
  const [specialty, setSpecialty] = useState(view.specialty);
  const [nameTouched, setNameTouched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const nameProblem = checkNameAr(nameAr);
  const nameError = nameTouched && nameProblem ? nameErrorText(nameProblem) : null;
  const changed = nameAr.trim() !== view.nameAr || specialty !== view.specialty;

  function nameErrorText(e: NameArError) {
    return e === "tooLong" ? t("edit.errors.tooLong", { max: LISTING_LIMITS.nameArMax }) : t(`edit.errors.${e}`);
  }

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameTouched(true);
    setSaveError(null);
    if (nameProblem || !changed) return;
    startSave(async () => {
      const result = await saveListing({ id: view.id, nameAr: nameAr.trim(), specialty }).catch(() => ({ ok: false as const, error: "unavailable" as const }));
      if (result.ok) {
        land({ saved: view.id, savedNameAr: nameAr.trim(), savedSpecialty: specialty });
      } else if (result.error === "required" || result.error === "notArabic" || result.error === "tooLong") {
        setSaveError(nameErrorText(result.error));
      } else {
        setSaveError(t(`edit.errors.${result.error}`));
      }
    });
  }

  /* ---------------- Suspend and unsuspend ---------------- */
  const [confirming, setConfirming] = useState(confirmOnLoad && view.canSuspend);
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [acting, startAct] = useTransition();
  const reasonProblem = checkReason(reason);
  const reasonError = reasonTouched && reasonProblem ? reasonErrorText(reasonProblem) : null;

  function reasonErrorText(e: ReasonError) {
    if (e === "tooShort") return t("suspend.errors.tooShort", { min: LISTING_LIMITS.reasonMin });
    if (e === "tooLong") return t("suspend.errors.tooLong", { max: LISTING_LIMITS.reasonMax });
    return t("suspend.errors.required");
  }

  function suspend() {
    setReasonTouched(true);
    setStatusError(null);
    if (reasonProblem) return;
    startAct(async () => {
      const result = undoes("unsuspended")
        ? await undoListingChange({ id: view.id, kind: "unsuspended" }).catch(() => ({ ok: false as const, error: "unavailable" as const }))
        : await suspendListing({ id: view.id, reason: reason.trim() }).catch(() => ({ ok: false as const, error: "unavailable" as const }));
      if (result.ok) land(undoes("unsuspended") ? { undone: view.id } : { suspended: view.id });
      else if (result.error === "required" || result.error === "tooShort" || result.error === "tooLong") setStatusError(reasonErrorText(result.error));
      else setStatusError(t(`suspend.errors.${result.error}`));
    });
  }

  function unsuspend() {
    setStatusError(null);
    startAct(async () => {
      const result = undoes("suspended")
        ? await undoListingChange({ id: view.id, kind: "suspended" }).catch(() => ({ ok: false as const, error: "unavailable" as const }))
        : await unsuspendListing({ id: view.id }).catch(() => ({ ok: false as const, error: "unavailable" as const }));
      if (result.ok) land(undoes("suspended") ? { undone: view.id } : { unsuspended: view.id });
      else setStatusError(t(`unsuspend.errors.${result.error}`));
    });
  }

  // While the suspend question is open, its two buttons are the only actions on screen.
  const footer = view.editable && !confirming ? (
    <div className="flex flex-col gap-2">
      {saveError ? (
        <p role="alert" className="text-sm text-danger">
          {saveError}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" className="px-3" onClick={() => sheetRef.current?.close()}>
          {tc("cancel")}
        </Button>
        <Button type="submit" form={FORM_ID} className="flex-1" disabled={saving || !changed}>
          {saving ? t("edit.saving") : t("edit.save")}
        </Button>
      </div>
    </div>
  ) : undefined;

  return (
    <Sheet ref={sheetRef} id={SHEET_ID} title={view.name} closeLabel={tc("close")} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-6">
        <section aria-label={view.statusLabel} className="flex flex-col items-start gap-3">
          <Badge tone={view.statusTone}>{view.statusLabel}</Badge>
          {view.notice ? (
            <Notice
              tone={view.notice.tone}
              title={view.notice.title}
              className="w-full"
              body={
                view.notice.lines.length ? (
                  <>
                    {view.notice.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </>
                ) : undefined
              }
              action={
                view.notice.action ? (
                  <LinkButton href={view.notice.action.href} variant="secondary">
                    {view.notice.action.label}
                  </LinkButton>
                ) : undefined
              }
            />
          ) : null}
        </section>

        <section aria-labelledby={`${SHEET_ID}-preview`} className="flex flex-col gap-3">
          <h3 id={`${SHEET_ID}-preview`} className="font-bold text-sea-900">
            {t("preview")}
          </h3>
          {view.card ? <DoctorCard doctor={view.card.data} state={view.card.state} size="mini" side="front" /> : null}
          {view.noCard ? <p className="rounded-[var(--radius-field)] bg-sand-100 px-4 py-3 text-sm text-ink-700">{view.noCard}</p> : null}
          {view.profileHref ? (
            <LinkButton href={view.profileHref} variant="secondary" className="self-start">
              {t("viewProfile")}
            </LinkButton>
          ) : null}
        </section>

        <section aria-labelledby={`${SHEET_ID}-details`}>
          <h3 id={`${SHEET_ID}-details`} className="font-bold text-sea-900">
            {t("details")}
          </h3>
          <dl className="mt-2 divide-y divide-sand-200 rounded-[var(--radius-field)] border border-sand-200 bg-white">
            {view.details.map((d) => (
              <div key={d.term} className="grid gap-x-4 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <dt className="text-sm text-ink-500">{d.term}</dt>
                <dd className="text-[15px] text-ink-900">{d.ltr ? <span className="ltr-run tabular">{d.value}</span> : d.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby={`${SHEET_ID}-edit`}>
          <h3 id={`${SHEET_ID}-edit`} className="font-bold text-sea-900">
            {t("edit.title")}
          </h3>
          {view.editable ? (
            <form id={FORM_ID} onSubmit={save} noValidate className="mt-3 flex flex-col gap-4">
              <Field id="listing-name-ar" label={t("edit.nameAr")} hint={t("edit.nameArHint")} error={nameError ?? undefined}>
                <Input
                  id="listing-name-ar"
                  name="nameAr"
                  lang="ar"
                  dir="rtl"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={LISTING_LIMITS.nameArMax + 20}
                  value={nameAr}
                  invalid={Boolean(nameError)}
                  aria-describedby={nameError ? "listing-name-ar-error" : "listing-name-ar-hint"}
                  onChange={(e) => setNameAr(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                />
              </Field>
              <Field id="listing-specialty" label={t("edit.specialty")} hint={t("edit.specialtyHint")}>
                <Select
                  id="listing-specialty"
                  name="specialty"
                  value={specialty}
                  aria-describedby="listing-specialty-hint"
                  onChange={(e) => setSpecialty(e.target.value)}
                >
                  {specialtyOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </form>
          ) : (
            <p className="mt-2 text-sm text-ink-700">{t("edit.readOnly")}</p>
          )}
        </section>

        {view.canSuspend ? (
          <section aria-labelledby={`${SHEET_ID}-suspend`} className="border-t border-sand-300 pt-5">
            <h3 id={`${SHEET_ID}-suspend`} className="font-bold text-sea-900">
              {confirming ? t("suspend.confirmTitle", { name: view.name }) : t("suspend.title")}
            </h3>
            {confirming ? (
              <div className="mt-2 flex flex-col gap-4">
                <p className="text-sm text-ink-700">{t("suspend.confirmBody")}</p>
                <Field id="listing-suspend-reason" label={t("suspend.reason")} hint={t("suspend.reasonHint")} error={reasonError ?? undefined}>
                  <Textarea
                    id="listing-suspend-reason"
                    name="reason"
                    className="min-h-28"
                    value={reason}
                    invalid={Boolean(reasonError)}
                    aria-describedby={reasonError ? "listing-suspend-reason-error" : "listing-suspend-reason-hint"}
                    onChange={(e) => setReason(e.target.value)}
                    onBlur={() => reason.trim() && setReasonTouched(true)}
                  />
                </Field>
                {statusError ? (
                  <p role="alert" className="text-sm text-danger">
                    {statusError}
                  </p>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  {/* Keep listed is the safe default, so it takes the focus when the question appears. */}
                  <Button type="button" variant="secondary" autoFocus disabled={acting} onClick={() => setConfirming(false)}>
                    {t("suspend.keep")}
                  </Button>
                  <Button type="button" variant="danger" disabled={acting} onClick={suspend}>
                    {acting ? t("suspend.working") : t("suspend.confirm")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex flex-col items-start gap-3">
                <p className="text-sm text-ink-700">{t("suspend.body")}</p>
                <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
                  {t("suspend.open")}
                </Button>
              </div>
            )}
          </section>
        ) : null}

        {view.canUnsuspend ? (
          <section aria-labelledby={`${SHEET_ID}-unsuspend`} className="border-t border-sand-300 pt-5">
            <h3 id={`${SHEET_ID}-unsuspend`} className="font-bold text-sea-900">
              {t("unsuspend.title")}
            </h3>
            <div className="mt-1 flex flex-col items-start gap-3">
              <p className="text-sm text-ink-700">{t("unsuspend.body")}</p>
              {statusError ? (
                <p role="alert" className="text-sm text-danger">
                  {statusError}
                </p>
              ) : null}
              <Button type="button" disabled={acting} onClick={unsuspend}>
                {acting ? t("unsuspend.working") : t("unsuspend.action")}
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </Sheet>
  );
}
