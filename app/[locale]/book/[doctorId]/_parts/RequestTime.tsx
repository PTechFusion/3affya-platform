"use client";
// "Request a time" (the slot picker's path when no open time suits, rules L3 and S6): the parts of the day that suit the
// patient, in the patient's zone, plus the same questions the picker asks (P8, C12). It reaches the doctor's inbox as an
// introduction request (screen 32). Nothing is held and nothing is charged. ?state=sent shows the sent state.
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, CheckCard, CheckIcon, LinkButton } from "@/components/ui";
import { requestTime } from "./actions";
import { TIME_WINDOWS, validateAnswers, type AnswerErrors, type Answers, type TimeWindow } from "./booking";
import { AboutFields, VisitTypeField, fieldId, focusFirstError, useAnswerErrorText, type BookingDoctor } from "./fields";

type Errors = AnswerErrors & { when?: "required" };
const ORDER = ["visit", "when", "forWhom", "ageGroup", "reason"] as const;

export function RequestTime({
  doctor,
  zone,
  initialAnswers,
  initialSent,
  profileHref,
}: {
  doctor: BookingDoctor;
  /** The patient's zone named, e.g. "Riyadh (GMT+3)". */
  zone: string;
  initialAnswers: Answers;
  initialSent: boolean;
  profileHref: string;
}) {
  const t = useTranslations("book");
  const errorText = useAnswerErrorText(doctor);
  const [answers, setAnswers] = useState(initialAnswers);
  const [when, setWhen] = useState<Set<TimeWindow>>(new Set());
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(initialSent);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const update = (patch: Partial<Answers>) => {
    setAnswers((a) => ({ ...a, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch) as Array<keyof Answers>) delete next[k];
      return next;
    });
  };

  const toggle = (w: TimeWindow) => {
    setWhen((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
    setErrors((e) => ({ ...e, when: undefined }));
  };

  const send = () => {
    const found: Errors = validateAnswers(answers, doctor, undefined);
    if (!when.size) found.when = "required";
    setErrors(found);
    if (Object.keys(found).length) {
      window.setTimeout(() => focusFirstError(ORDER, found), 0);
      return;
    }
    setFailed(false);
    startTransition(async () => {
      try {
        const r = await requestTime({ doctorId: doctor.id, ...answers, when: [...when] });
        if (r.ok) setSent(true);
        else if (r.error === "validation") setErrors(r.fields);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    });
  };

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-sand-200 bg-white p-6">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
          <CheckIcon className="size-6" />
        </span>
        <h2 className="text-xl font-bold text-sea-900">{t("request.sentTitle", { name: doctor.name })}</h2>
        <p className="text-ink-700">{t("request.sentBody", { name: doctor.name })}</p>
        <LinkButton href={profileHref}>{t("request.sentAction", { name: doctor.name })}</LinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <VisitTypeField doctor={doctor} value={answers.visit} onChange={(visit) => update({ visit })} error={errorText("visit", errors)} />

      <fieldset id={fieldId("when")} className="border-t border-sand-200 pt-6" aria-describedby={errors.when ? `${fieldId("when")}-error` : undefined}>
        <legend className="float-start w-full text-xl font-bold text-sea-900">{t("request.when")}</legend>
        <p className="mb-3 mt-1 text-sm text-ink-700">
          {t("calendar.zoneLead")} <span className="ltr-run font-semibold text-ink-900">{zone}</span>
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {TIME_WINDOWS.map((w) => (
            <CheckCard key={w} title={t(`request.${w}`)} checked={when.has(w)} onChange={() => toggle(w)} name="when" value={w} />
          ))}
        </div>
        {errors.when ? (
          <p id={`${fieldId("when")}-error`} role="alert" className="mt-1.5 text-sm text-danger">
            {t("errors.when.required")}
          </p>
        ) : null}
      </fieldset>

      <section aria-labelledby="book-about-title" className="border-t border-sand-200 pt-6">
        <h2 id="book-about-title" className="text-xl font-bold text-sea-900">
          {t("questions.title")}
        </h2>
        <p className="mb-4 mt-1 text-sm text-ink-700">{t("questions.lead", { name: doctor.name })}</p>
        <AboutFields doctor={doctor} answers={answers} errors={errors} onChange={update} />
      </section>

      <div className="flex flex-col items-start gap-2 border-t border-sand-200 pt-6">
        {failed ? (
          <p role="alert" className="text-sm text-danger">
            {t("request.failed")}
          </p>
        ) : null}
        <Button size="lg" onClick={send} disabled={pending} aria-busy={pending || undefined} className="w-full sm:w-auto">
          {pending ? t("request.sending") : t("request.send")}
        </Button>
        <p className="text-sm text-ink-700">{t("request.noCharge")}</p>
      </div>
    </div>
  );
}
