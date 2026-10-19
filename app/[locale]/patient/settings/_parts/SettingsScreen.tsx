"use client";
// Settings, the interactive part (screen 28). The groups follow the layout call: Language, Time zone, Calendar, Emails, then
// the details and data groups this screen adds, then Delete. Routine changes apply at once and offer Undo from one bar at the
// bottom of the screen (rule B10); only the two deletions ask first, with buttons that name the outcome. The bar and the
// account-deletion state live here because more than one group reads them.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Toast, ToastRegion } from "@/components/ui";
import { keepAccount } from "../actions";
import { DataGroup, DeleteGroup } from "./DataGroups";
import { DetailsForm } from "./DetailsForm";
import { FOCUS, type SettingsProps, type When } from "./model";
import { CalendarGroup, EmailsGroup, LanguageGroup, TimeZoneGroup } from "./PreferenceGroups";
import type { DetailsInput } from "./validation";

/** Shows one line in the Undo bar; `undo`, when given, is what the bar's Undo button runs. */
export type Notify = (message: string, undo?: () => void) => void;
/** Moves focus to an element id after the next render (the control the patient needs next). */
export type FocusLater = (id: string) => void;

// Prototype states open at the top of the page like any visit (a full-page screenshot of a scrolled page draws the sticky
// header mid-page). Each group is an anchor, so a state can be opened on its group: ?state=invalid#details.
export function SettingsScreen(props: SettingsProps) {
  const { preview } = props;
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(() =>
    preview === "saved" ? { message: t("toast.detailsSaved") } : null,
  );
  const [saved, setSaved] = useState<DetailsInput>(props.savedDetails);
  const [scheduled, setScheduled] = useState<When | null>(preview === "deletionRequested" ? props.scheduledOn : null);
  const [keeping, setKeeping] = useState(false);

  // Focus never drops to the page after an action. The tick re-renders this component, so the effect also runs when only a
  // child group's state changed (opening a confirmation, say).
  const focusNext = useRef<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    if (!focusNext.current) return;
    const target = document.getElementById(focusNext.current);
    const el = target?.tagName === "DIV" ? target.querySelector<HTMLElement>("button") : target;
    // Centre what gets focus (an opened confirmation, the banner) so the Undo bar and the phone nav never cover it; the bar's
    // own Close button is fixed, so it only takes focus.
    el?.focus({ preventScroll: true });
    if (el && focusNext.current !== FOCUS.toast) el.scrollIntoView({ block: "center" });
    focusNext.current = null;
  }, [focusTick]);
  const focusLater: FocusLater = (id) => {
    focusNext.current = id;
    setFocusTick((n) => n + 1);
  };

  const notify: Notify = (message, undo) => setToast({ message, undo });

  function runUndo() {
    const undo = toast?.undo;
    if (!undo) return;
    setToast({ message: t("toast.undone") });
    focusLater(FOCUS.toast); // the Undo button is gone; Close in the same bar keeps the focus
    undo();
  }

  async function keep() {
    setKeeping(true);
    const result = await keepAccount().catch(() => ({ ok: false as const, error: "unavailable" as const }));
    setKeeping(false);
    if (!result.ok) {
      notify(t("toast.failed"));
      return;
    }
    setScheduled(null);
    notify(t("toast.kept"));
    focusLater(FOCUS.deleteAccount);
  }

  function onDeletionRequested() {
    const when = props.deleteOn;
    setScheduled(when);
    notify(t("toast.deletionRequested", { day: when.day }), () => void keep());
    focusLater(FOCUS.banner);
  }

  const nowrap = (chunks: React.ReactNode) => <span className="whitespace-nowrap">{chunks}</span>;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {scheduled ? (
        <section aria-labelledby={FOCUS.banner} className="rounded-[var(--radius-card)] border border-gold-500/50 bg-gold-100 p-5">
          <h2 id={FOCUS.banner} tabIndex={-1} className="text-lg font-bold text-ink-900">
            {t("delete.banner.title", { day: scheduled.day })}
          </h2>
          <p className="mt-1 text-ink-900">{t.rich("delete.banner.body", { time: scheduled.time, nowrap })}</p>
          <Button type="button" onClick={() => void keep()} disabled={keeping} className="mt-4 w-full sm:w-auto">
            {t("delete.banner.action")}
          </Button>
        </section>
      ) : null}

      <LanguageGroup />
      <TimeZoneGroup zoneGroups={props.zoneGroups} initial={props.timeZone} notify={notify} />
      <CalendarGroup initial={props.hijri} example={props.hijriExample} notify={notify} />
      <EmailsGroup initial={props.emails} email={saved.email} notify={notify} />
      <DetailsForm
        initialValues={props.initialDetails}
        initialErrors={props.initialErrors}
        initialFailed={preview === "error"}
        saved={saved}
        onSavedChange={setSaved}
        notify={notify}
      />
      <DataGroup email={saved.email} initialRequested={preview === "exportRequested"} />
      <DeleteGroup
        initialHasUploads={props.hasUploads && preview !== "empty"}
        initialUploadsConfirm={preview === "deleteUploadsConfirm"}
        initialAccountConfirm={preview === "deleteConfirm"}
        deleteOn={props.deleteOn}
        scheduled={scheduled}
        onDeletionRequested={onDeletionRequested}
        notify={notify}
        focusLater={focusLater}
      />

      <ToastRegion>
        {toast ? (
          <Toast
            id={FOCUS.toast}
            message={toast.message}
            actionLabel={toast.undo ? t("toast.undo") : undefined}
            onAction={toast.undo ? runUndo : undefined}
            dismissLabel={tc("close")}
            onDismiss={() => setToast(null)}
          />
        ) : null}
      </ToastRegion>
    </div>
  );
}
