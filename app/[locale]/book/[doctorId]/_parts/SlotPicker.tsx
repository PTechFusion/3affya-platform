"use client";
// Screen 19, the slot picker's interactive part. Phone order (layout call): the mini card (passed in from the server), the
// visit type, the week strip and the slot grid in the patient's zone, then the questions once a time is picked, with Continue
// in a bar pinned to the bottom. Desktop: the card and the Continue panel pinned at the reading end.
// The hook: the earliest open time is highlighted; a time tapped on the profile arrives pre-selected (?slot=).
// The hold starts only after every answer is in (rule P8) and the tap answers at once (L2): the button reads "Holding" while the
// stub action runs, then the bar shows the hold timer and the page moves on to checkout.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, ChevronNext, ClockIcon, IconButton, LinkButton, SlotOption } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import { holdSlot } from "./actions";
import {
  ANSWER_FIELDS,
  bookingQuery,
  draftKey,
  validateAnswers,
  type AnswerErrors,
  type Answers,
  type Keep,
} from "./booking";
import type { DayView, SlotView, WeekView } from "./calendar";
import { AboutFields, VisitTypeField, focusFirstError, useAnswerErrorText, type BookingDoctor } from "./fields";
import { HoldCountdown } from "./HoldCountdown";

type Phase = "idle" | "holding" | "held";
type Notice = "taken" | "failed" | undefined;

type Props = {
  doctor: BookingDoctor;
  card: React.ReactNode;
  weeks: WeekView[];
  initialWeek: number;
  /** The first week had no open time, so the picker opened on a later one (rule L3: never an empty grid). */
  jumped: boolean;
  initialSlot?: string;
  /** ?state=taken: the time that was just booked by someone else. */
  takenSlot?: string;
  initialAnswers: Answers;
  /** ?state=held: the hold has started. */
  held?: { heldUntil: string; remainingMs: number };
  price: string;
  weekendLegend?: string;
  keep: Keep;
  holdMinutes: number;
};

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");

export function SlotPicker(props: Props) {
  const { doctor, weeks, keep } = props;
  const t = useTranslations("book");
  const tc = useTranslations("common");
  const loc = useLocale() as Locale;
  const rtl = loc === "ar";
  const router = useRouter();
  const errorText = useAnswerErrorText(doctor);

  const index = useMemo(() => {
    const map = new Map<string, { slot: SlotView; day: DayView; week: number }>();
    weeks.forEach((w, wi) => w.days.forEach((d) => d.slots.forEach((s) => map.set(s.iso, { slot: s, day: d, week: wi }))));
    return map;
  }, [weeks]);
  const allSlots = useMemo(() => weeks.flatMap((w) => w.days.flatMap((d) => d.slots)), [weeks]);

  const firstDayWithSlots = (w: number, taken: Set<string>) =>
    weeks[w]?.days.find((d) => d.slots.some((s) => !taken.has(s.iso)))?.key ?? weeks[w]?.days[0]?.key ?? "";

  const [taken, setTaken] = useState<Set<string>>(() => new Set(props.takenSlot ? [props.takenSlot] : []));
  const [week, setWeek] = useState(props.initialWeek);
  const [dayKey, setDayKey] = useState(() =>
    props.initialSlot ? (index.get(props.initialSlot)?.day.key ?? "") : firstDayWithSlots(props.initialWeek, taken),
  );
  const [slot, setSlot] = useState<string | undefined>(props.initialSlot);
  const [navigated, setNavigated] = useState(false);
  const [typed, setTyped] = useState<Answers>(props.initialAnswers);
  const [reasonEdited, setReasonEdited] = useState(Boolean(props.initialAnswers.reason));
  const [errors, setErrors] = useState<AnswerErrors>({});
  const [phase, setPhase] = useState<Phase>(props.held ? "held" : "idle");
  const [hold, setHold] = useState(props.held);
  const [notice, setNotice] = useState<Notice>(props.takenSlot ? "taken" : undefined);
  const [lastTaken, setLastTaken] = useState(props.takenSlot);
  const [status, setStatus] = useState("");
  const [, startTransition] = useTransition();
  const touchX = useRef<number | null>(null);

  // Rule F2: coming back from checkout ("Change") keeps the reason typed before. The server snapshot is empty, so the server and
  // the first client render agree; sessionStorage can be missing or blocked, which only means starting with an empty box.
  const savedReason = useSyncExternalStore(noSubscribe, () => readDraftReason(doctor.id), () => "");

  // Checkout's Change links land on a field (#book-slot, #book-visit, #book-forWhom): bring it into view once drawn.
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (target) document.getElementById(target)?.scrollIntoView({ block: "start" });
  }, []);
  const answers: Answers = reasonEdited ? typed : { ...typed, reason: typed.reason || savedReason };

  const earliest = allSlots.find((s) => !taken.has(s.iso))?.iso;
  const current = weeks[week];
  const day = current?.days.find((d) => d.key === dayKey) ?? current?.days.find((d) => d.slots.length) ?? current?.days[0];
  const selected = slot ? index.get(slot) : undefined;
  const nextOpenWeek = weeks.findIndex((w, i) => i > week && w.days.some((d) => d.slots.some((s) => !taken.has(s.iso))));
  const nextOpenDay = nextOpenWeek >= 0 ? weeks[nextOpenWeek]?.days.find((d) => d.slots.length)?.label : undefined;
  const weekOpen = Boolean(current?.days.some((d) => d.slots.some((s) => !taken.has(s.iso))));
  const showAbout = Boolean(slot) || Object.keys(errors).length > 0;
  const requestHref = `/book/${doctor.id}${bookingQuery({ extra: { step: "request" }, keep })}`;

  const goWeek = (w: number) => {
    if (w < 0 || w >= weeks.length || w === week) return;
    setWeek(w);
    setNavigated(true);
    const inWeek = selected && selected.week === w ? selected.day.key : firstDayWithSlots(w, taken);
    setDayKey(inWeek);
  };

  // A hold covers one time and the answers given with it; changing either means holding again.
  const dropHold = () => {
    if (phase !== "held") return;
    setPhase("idle");
    setHold(undefined);
  };

  const choose = (iso: string) => {
    dropHold();
    setSlot(iso);
    setNotice(undefined);
    setErrors((e) => {
      const next = { ...e };
      delete next.slot;
      return next;
    });
  };

  const update = (patch: Partial<Answers>) => {
    dropHold();
    if ("reason" in patch) setReasonEdited(true);
    setTyped((a) => ({ ...a, reason: answers.reason, ...patch }));
    // An error clears the moment its field is answered (rule F4).
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch) as Array<keyof Answers>) delete next[k];
      return next;
    });
  };

  const payHref = (heldUntil: string) =>
    `/book/${doctor.id}/pay${bookingQuery({ slot, visit: answers.visit, forWhom: answers.forWhom, ageGroup: answers.ageGroup, heldUntil, keep })}`;

  const submit = () => {
    const found = validateAnswers(answers, doctor, Boolean(slot));
    setErrors(found);
    if (Object.keys(found).length || !slot) {
      // The questions open first, then focus moves to the first gap.
      window.setTimeout(() => focusFirstError(ANSWER_FIELDS, found), 0);
      return;
    }
    setPhase("holding");
    setNotice(undefined);
    const chosen = slot;
    startTransition(async () => {
      try {
        const r = await holdSlot({ doctorId: doctor.id, slot: chosen, ...answers });
        if (r.ok) {
          try {
            window.sessionStorage.setItem(draftKey(doctor.id), JSON.stringify({ reason: answers.reason }));
          } catch {
            /* the draft is a convenience; checkout works without it */
          }
          setHold({ heldUntil: r.heldUntil, remainingMs: r.holdMs });
          setPhase("held");
          setStatus(
            t("summary.heldStatus", {
              slot: selected?.slot.summary ?? "",
              minutes: props.holdMinutes,
              minutesLabel: formatNumber(props.holdMinutes, loc),
            }),
          );
          router.push(payHref(r.heldUntil));
          return;
        }
        setPhase("idle");
        if (r.error === "validation") {
          setErrors(r.fields);
          window.setTimeout(() => focusFirstError(ANSWER_FIELDS, r.fields), 0);
        } else if (r.error === "taken" || r.error === "passed") {
          setTaken((prev) => new Set(prev).add(chosen));
          setLastTaken(chosen);
          setSlot(undefined);
          setNotice("taken");
        } else {
          setNotice("failed");
        }
      } catch {
        setPhase("idle");
        setNotice("failed");
      }
    });
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    const end = e.changedTouches[0]?.clientX;
    if (start == null || end == null || Math.abs(end - start) < 48) return;
    const forward = rtl ? end > start : end < start; // swipe toward the reading start moves on a week
    goWeek(week + (forward ? 1 : -1));
  };

  const takenInfo = lastTaken ? index.get(lastTaken) : undefined;

  /* ---------- the Continue control, shared by the phone bar and the desktop panel ---------- */
  const action =
    phase === "held" && hold && slot ? (
      <LinkButton href={payHref(hold.heldUntil)} size="lg" className="w-full whitespace-nowrap lg:w-full">
        {t("summary.toPayment")} <ChevronNext />
      </LinkButton>
    ) : (
      <Button size="lg" className="w-full whitespace-nowrap" onClick={submit} disabled={phase === "holding"} aria-busy={phase === "holding" || undefined}>
        {phase === "holding" ? t("summary.holding") : tc("continue")}
      </Button>
    );

  const heldLine =
    phase === "held" && hold ? (
      <p className="flex items-center gap-1.5 text-sm font-semibold text-lagoon-900">
        <ClockIcon />
        {t("summary.heldFor")} <HoldCountdown remainingMs={hold.remainingMs} />
      </p>
    ) : null;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-12">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1">
          {props.card}
          {/* Desktop: the Continue panel under the card. Phone uses the bottom bar instead. */}
          <div className="hidden rounded-[var(--radius-card)] border border-sand-200 bg-white p-5 lg:block">
            <p className="text-sm text-ink-500">{t("summary.price")}</p>
            <p className="tabular text-2xl font-bold text-sea-900">{props.price}</p>
            <p className="mt-1 text-sm text-ink-700">{t("summary.includes")}</p>
            <div className="mt-4 border-t border-sand-200 pt-4">
              <p className="text-sm text-ink-500">{t("summary.yourTime")}</p>
              <p className="font-semibold text-ink-900">{selected ? selected.slot.summary : t("summary.pick")}</p>
              {selected ? <p className="ltr-run text-xs text-ink-500">{selected.day.zone}</p> : null}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {heldLine}
              {action}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:col-start-1 lg:row-start-1">
          <VisitTypeField
            doctor={doctor}
            value={answers.visit}
            onChange={(visit) => update({ visit })}
            error={errorText("visit", errors)}
          />

          <section aria-labelledby="book-calendar-title" className="border-t border-sand-200 pt-4 sm:pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 id="book-calendar-title" className="text-xl font-bold text-sea-900">
                {t("calendar.title")}
              </h2>
              {/* Rule P6: the patient's zone is named for the day shown; the clock icon never mirrors (R2). */}
              <p className="flex items-center gap-1.5 text-sm text-ink-700">
                <ClockIcon className="size-4 shrink-0 text-ink-500" />
                {t("calendar.zoneLead")} <span className="ltr-run font-semibold text-ink-900">{day?.zone}</span>
              </p>
            </div>

            {notice === "taken" && takenInfo ? (
              <Note tone="warning" title={t("calendar.takenTitle")} body={t("calendar.takenBody", { slot: takenInfo.slot.summary })} />
            ) : null}
            {notice === "failed" ? <Note tone="warning" title={t("errors.holdFailedTitle")} body={t("errors.holdFailedBody")} /> : null}
            {props.jumped && !navigated && week === props.initialWeek ? (
              <Note
                tone="info"
                title={t("calendar.jumpedTitle")}
                body={t("calendar.jumpedBody", { day: current?.days[0]?.label ?? "" })}
                action={
                  <Link href={requestHref} className="inline-flex min-h-11 items-center font-semibold text-sea-700 hover:underline">
                    {t("calendar.requestInstead")}
                  </Link>
                }
              />
            ) : null}

            <div className="mt-2 flex sm:mt-4 items-center justify-between gap-2">
              <IconButton label={t("calendar.prevWeek")} onClick={() => goWeek(week - 1)} disabled={week === 0}>
                {/* Back chevron: the flipped wrapper plus ChevronNext's own RTL mirror point it toward the start (rule R2). */}
                <span className="inline-flex -scale-x-100">
                  <ChevronNext className="size-5" />
                </span>
              </IconButton>
              <p className="min-w-0 text-center text-sm font-semibold text-ink-900" aria-live="polite">
                {current?.label}
              </p>
              <IconButton label={t("calendar.nextWeek")} onClick={() => goWeek(week + 1)} disabled={week >= weeks.length - 1}>
                <ChevronNext className="size-5" />
              </IconButton>
            </div>

            {/* The week strip: seven days, weekends shaded for the patient's country and named for screen readers (rule P7). */}
            <ul
              className="mt-2 grid grid-cols-7 gap-0.5 sm:gap-2"
              aria-label={current?.label}
              onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
              onTouchEnd={onTouchEnd}
            >
              {current?.days.map((d) => {
                const open = d.slots.filter((s) => !taken.has(s.iso)).length;
                const isDay = d.key === day?.key && d.slots.length > 0;
                return (
                  <li key={d.key}>
                    <button
                      type="button"
                      aria-pressed={isDay}
                      disabled={d.slots.length === 0}
                      onClick={() => setDayKey(d.key)}
                      aria-label={[d.label, t("calendar.dayTimes", { count: open, countLabel: formatNumber(open, loc) }), d.weekend ? t("calendar.weekend") : ""].filter(Boolean).join(", ")}
                      className={cx(
                        "flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-field)] border text-center transition-colors disabled:cursor-default",
                        isDay
                          ? "border-sea-700 bg-sea-700 text-white"
                          : d.slots.length
                            ? cx("border-sand-300 text-ink-900 hover:border-sea-700", d.weekend ? "bg-sand-200" : "bg-white")
                            : cx("border-transparent text-ink-500", d.weekend ? "bg-sand-200/70" : "bg-transparent"),
                      )}
                    >
                      <span className="text-xs font-medium leading-none">{d.short}</span>
                      <span className="tabular text-lg font-bold leading-none">{d.number}</span>
                      <span
                        aria-hidden="true"
                        className={cx("size-1.5 rounded-full", open ? (isDay ? "bg-white" : "bg-lagoon-600") : "bg-transparent")}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            {weekOpen && day ? (
              <fieldset id="book-slot" className="mt-3 sm:mt-5" aria-describedby={errors.slot ? "book-slot-error" : undefined}>
                <legend className="text-[15px] font-semibold text-ink-900">{t("calendar.timesOn", { day: day.label })}</legend>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                  {day.slots.map((s) => {
                    const isChosen = slot === s.iso;
                    const isTaken = taken.has(s.iso);
                    return (
                      <SlotOption
                        key={s.iso}
                        name="slot"
                        value={s.iso}
                        checked={isChosen}
                        onChange={() => choose(s.iso)}
                        disabled={isTaken}
                        time={s.time}
                        label={isTaken ? `${s.label}, ${t("calendar.takenShort")}` : s.label}
                        highlight={s.iso === earliest && !isChosen}
                        note={isChosen ? s.doctorTime : isTaken ? t("calendar.takenShort") : s.iso === earliest ? t("calendar.earliest") : undefined}
                      />
                    );
                  })}
                </div>
                {errors.slot ? (
                  <p id="book-slot-error" role="alert" className="mt-1.5 text-sm text-danger">
                    {errorText("slot", errors)}
                  </p>
                ) : null}
              </fieldset>
            ) : (
              // Rule L3 / S6: a week without times says why and offers the next open week and a request, never an empty grid.
              <Note
                tone="info"
                title={t("calendar.emptyWeekTitle")}
                body={nextOpenDay ? t("calendar.emptyWeekBody", { day: nextOpenDay }) : t("calendar.emptyWeekNone")}
                action={
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {nextOpenWeek >= 0 ? (
                      <Button variant="secondary" onClick={() => goWeek(nextOpenWeek)}>
                        {t("calendar.showNextWeek")}
                      </Button>
                    ) : null}
                    <Link href={requestHref} className="inline-flex min-h-11 items-center font-semibold text-sea-700 hover:underline">
                      {t("calendar.requestLink")}
                    </Link>
                  </div>
                }
              />
            )}

            <div className="mt-3 space-y-1 text-sm">
              {/* Rule P6: the doctor's own time is secondary, under the grid for the chosen time. */}
              {selected ? <p className="text-ink-700">{selected.slot.doctorLine}</p> : null}
              {props.weekendLegend ? <p className="text-ink-500">{props.weekendLegend}</p> : null}
              {weekOpen ? (
                <p className="text-ink-700">
                  {t("calendar.requestLead")}{" "}
                  <Link href={requestHref} className="font-semibold text-sea-700 underline-offset-2 hover:underline">
                    {t("calendar.requestLink")}
                  </Link>
                </p>
              ) : null}
            </div>
          </section>

          {showAbout ? (
            <section aria-labelledby="book-about-title" className="border-t border-sand-200 pt-6">
              <h2 id="book-about-title" className="text-xl font-bold text-sea-900">
                {t("questions.title")}
              </h2>
              <p className="mb-4 mt-1 text-sm text-ink-700">{t("questions.lead", { name: doctor.name })}</p>
              <AboutFields doctor={doctor} answers={answers} errors={errors} onChange={update} />
            </section>
          ) : null}
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      {/* Phone: Continue stays in reach (layout call: sticky Continue). */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-sand-300 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            {heldLine ?? (
              <>
                <p className="truncate text-xs text-ink-700">{selected ? selected.slot.summary : t("summary.price")}</p>
                <p className="tabular text-lg font-bold leading-tight text-sea-900">{props.price}</p>
              </>
            )}
          </div>
          <div className="shrink-0">{action}</div>
        </div>
      </div>
      <div aria-hidden="true" className="h-20 lg:hidden" />
    </>
  );
}

/** The saved draft never changes while the picker is open, so there is nothing to subscribe to. */
const noSubscribe = () => () => {};

function readDraftReason(doctorId: string): string {
  try {
    const raw = window.sessionStorage.getItem(draftKey(doctorId));
    const parsed = raw ? (JSON.parse(raw) as { reason?: unknown }) : undefined;
    return typeof parsed?.reason === "string" ? parsed.reason : "";
  } catch {
    return "";
  }
}

function Note({
  tone,
  title,
  body,
  action,
}: {
  tone: "info" | "warning";
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      role={tone === "warning" ? "alert" : undefined}
      className={cx("mt-4 rounded-[var(--radius-field)] p-4", tone === "warning" ? "bg-gold-100 text-ink-900" : "bg-sky-100 text-ink-900")}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5 text-sm text-ink-700">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
