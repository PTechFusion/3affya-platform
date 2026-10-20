"use client";
// The questions the picker asks before the hold (rule P8) and the visit-type choice with its best-for line (C12), shared by the
// slot picker and "Request a time". Nothing is pre-chosen: the patient says who the visit is for and picks the visit type
// (do not default everyone to video). Errors sit under their own group, in words (F5); the doctor's age rule is checked as
// soon as an age group is picked, with a way to doctors who fit.
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Field, RadioCard, SegmentedControl, Textarea } from "@/components/ui";
import { bookingRules } from "@/config/business";
import { formatNumber, type Locale } from "@/lib/format";
import {
  FOR_WHOM,
  REASON_MAX,
  seesAgeGroup,
  type AgeGroup,
  type AnswerErrors,
  type AnswerField,
  type Answers,
  type DoctorAges,
  type VisitType,
} from "./booking";

export type BookingDoctor = {
  id: string;
  name: string;
  gender: "f" | "m";
  specialty: string;
  specialtySlug: string;
  visitTypes: VisitType[];
  ages: DoctorAges;
};

export const fieldId = (field: AnswerField | "when") => `book-${field}`;

/** Moves focus to the first field with an error, in page order. */
export function focusFirstError(order: readonly string[], errors: Record<string, unknown>) {
  const first = order.find((f) => errors[f]);
  if (!first) return;
  const box = document.getElementById(`book-${first}`);
  const target = box?.matches("input, textarea, select") ? box : box?.querySelector<HTMLElement>("input:not([disabled]), textarea, select");
  box?.scrollIntoView({ block: "center" });
  target?.focus({ preventScroll: true });
}

/** The error text for one answer, or undefined. */
export function useAnswerErrorText(doctor: BookingDoctor) {
  const t = useTranslations("book");
  const loc = useLocale() as Locale;
  return (field: AnswerField, errors: AnswerErrors, reason = ""): string | undefined => {
    const code = errors[field];
    if (!code) return undefined;
    if (field === "ageGroup" && code === "notSeen") return notSeenText(t, loc, doctor);
    if (field === "reason" && code === "tooLong") {
      return t("errors.reasonTooLong", { max: formatNumber(REASON_MAX, loc), count: formatNumber(reason.trim().length, loc) });
    }
    return t(`errors.${field}.${code}`);
  };
}

function notSeenText(t: ReturnType<typeof useTranslations>, loc: Locale, d: BookingDoctor): string {
  const age = bookingRules.adultFromYears;
  return t(d.ages === "children" ? "questions.notSeen.children" : "questions.notSeen.adults", {
    name: d.name,
    gender: d.gender,
    age,
    ageLabel: formatNumber(age, loc),
  });
}

export function VisitTypeField({
  doctor,
  value,
  onChange,
  error,
}: {
  doctor: BookingDoctor;
  value: VisitType | "";
  onChange: (v: VisitType) => void;
  error?: string;
}) {
  const t = useTranslations("book");
  const tcard = useTranslations("card");
  const only = doctor.visitTypes.length === 1 ? doctor.visitTypes[0] : undefined;
  if (only) {
    return (
      <div id={fieldId("visit")}>
        <p className="text-sm font-semibold text-ink-700">{t("visit.legend")}</p>
        <p className="mt-1 text-ink-900">
          <span className="font-semibold">{tcard(only)}:</span> {t(`visit.bestFor.${only}`)}
        </p>
        <p className="text-sm text-ink-700">{t("visit.onlyOne", { name: doctor.name, gender: doctor.gender })}</p>
      </div>
    );
  }
  return (
    <div id={fieldId("visit")}>
      <SegmentedControl<VisitType | "">
        legend={t("visit.legend")}
        name="visit"
        options={doctor.visitTypes.map((v) => ({ value: v, label: tcard(v) }))}
        value={value}
        onChange={(v) => v && onChange(v)}
      />
      {/* Rule C12: each type with its one-line best-for hint; both stay visible so choosing one does not move the page. */}
      <ul className="mt-2 space-y-0.5 text-sm">
        {doctor.visitTypes.map((v) => (
          <li key={v} className={value === v ? "text-ink-900" : "text-ink-700"}>
            <span className="font-semibold">{tcard(v)}:</span> {t(`visit.bestFor.${v}`)}
          </li>
        ))}
      </ul>
      {error ? (
        <p id={`${fieldId("visit")}-error`} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GroupError({ field, text }: { field: AnswerField | "when"; text?: string }) {
  return text ? (
    <p id={`${fieldId(field)}-error`} role="alert" className="mt-1.5 text-sm text-danger">
      {text}
    </p>
  ) : null;
}

const legendClass = "mb-2 text-[15px] font-semibold text-ink-900";

export function AboutFields({
  doctor,
  answers,
  errors,
  onChange,
}: {
  doctor: BookingDoctor;
  answers: Answers;
  errors: AnswerErrors;
  onChange: (patch: Partial<Answers>) => void;
}) {
  const t = useTranslations("book");
  const loc = useLocale() as Locale;
  const errorText = useAnswerErrorText(doctor);
  const n = (v: number) => formatNumber(v, loc);
  const ageHint = (g: (typeof bookingRules.ageGroups)[number]) =>
    g.toYears === null
      ? t("questions.age.from", { years: g.fromYears, yearsLabel: n(g.fromYears) })
      : g.fromYears === 0
        ? t("questions.age.under", { years: g.toYears + 1, yearsLabel: n(g.toYears + 1) })
        : t("questions.age.range", { from: n(g.fromYears), to: n(g.toYears), years: g.toYears });
  const ageLegend =
    answers.forWhom === "self" ? t("questions.age.legendSelf") : answers.forWhom === "child" ? t("questions.age.legendChild") : t("questions.age.legendOther");
  const notSeen = answers.ageGroup && !seesAgeGroup(doctor.ages, answers.ageGroup as AgeGroup);
  const otherAges = doctor.ages === "children" ? "adults" : "children";

  return (
    <div className="flex flex-col gap-6">
      <fieldset id={fieldId("forWhom")} aria-describedby={errors.forWhom ? `${fieldId("forWhom")}-error` : undefined}>
        <legend className={legendClass}>{t("questions.forWhom.legend")}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {FOR_WHOM.map((f) => (
            <RadioCard
              key={f}
              name="forWhom"
              value={f}
              checked={answers.forWhom === f}
              onChange={() => onChange({ forWhom: f })}
              title={t(`questions.forWhom.${f}`)}
              invalid={Boolean(errors.forWhom)}
            />
          ))}
        </div>
        <GroupError field="forWhom" text={errorText("forWhom", errors)} />
      </fieldset>

      <fieldset id={fieldId("ageGroup")} aria-describedby={errors.ageGroup || notSeen ? `${fieldId("ageGroup")}-error` : undefined}>
        <legend className={legendClass}>{ageLegend}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {bookingRules.ageGroups.map((g) => (
            <RadioCard
              key={g.id}
              name="ageGroup"
              value={g.id}
              checked={answers.ageGroup === g.id}
              onChange={() => onChange({ ageGroup: g.id })}
              title={t(`questions.age.${g.id}`)}
              description={ageHint(g)}
              invalid={Boolean(errors.ageGroup)}
            />
          ))}
        </div>
        {/* Rule P8: the doctor's age rule is shown the moment it does not fit, with doctors who do. */}
        {notSeen ? (
          <div id={`${fieldId("ageGroup")}-error`} role="alert" className="mt-2 rounded-[var(--radius-field)] bg-gold-100 p-3 text-sm text-ink-900">
            <p>{notSeenText(t, loc, doctor)}</p>
            <Link href={`/search?specialty=${doctor.specialtySlug}&age=${otherAges}`} className="mt-1 inline-flex min-h-8 items-center font-semibold text-sea-700 hover:underline">
              {t(`questions.notSeen.link.${otherAges}`, { specialty: doctor.specialty })}
            </Link>
          </div>
        ) : (
          <GroupError field="ageGroup" text={errorText("ageGroup", errors)} />
        )}
      </fieldset>

      <Field
        id={fieldId("reason")}
        label={t("questions.reason.label")}
        hint={t("questions.reason.hint", { name: doctor.name })}
        error={errorText("reason", errors, answers.reason)}
      >
        <Textarea
          id={fieldId("reason")}
          name="reason"
          value={answers.reason}
          onChange={(e) => onChange({ reason: e.target.value })}
          invalid={Boolean(errors.reason)}
          aria-describedby={errors.reason ? `${fieldId("reason")}-error` : `${fieldId("reason")}-hint`}
          maxLength={REASON_MAX + 50}
        />
      </Field>
    </div>
  );
}
