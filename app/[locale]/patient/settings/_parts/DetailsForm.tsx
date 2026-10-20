"use client";
// Your details: the name in both scripts, the email and an optional mobile number. Labels above, one column, only the optional
// field marked (F1). A field is checked on blur once it has been typed in, re-checked on every keystroke while it shows an
// error, and the error clears the moment it is fixed (F4). Each error names the sub-rule and the fix, next to the field, in text
// (F5). A failed save keeps the edits and says so (L4). Email and phone run left to right in both locales; the Arabic name
// runs right to left even on the English page. Saving offers Undo, which saves the previous details back (B10).
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, Field, Input } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import { saveDetails } from "../actions";
import { Group } from "./Group";
import type { Notify } from "./SettingsScreen";
import {
  DETAILS_FIELDS,
  checkDetails,
  checkDetailsField,
  type DetailsError,
  type DetailsErrors,
  type DetailsField,
  type DetailsInput,
  type SaveDetailsResult,
} from "./validation";

const fieldId = (field: DetailsField) => `settings-${field}`;

export function DetailsForm({
  initialValues,
  initialErrors,
  initialFailed,
  saved,
  onSavedChange,
  notify,
}: {
  initialValues: DetailsInput;
  initialErrors: DetailsErrors;
  initialFailed: boolean;
  saved: DetailsInput;
  onSavedChange: (values: DetailsInput) => void;
  notify: Notify;
}) {
  const t = useTranslations("settings");
  const loc = useLocale() as Locale;
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<DetailsErrors>(initialErrors);
  const [typedIn, setTypedIn] = useState<Partial<Record<DetailsField, boolean>>>({});
  const [failed, setFailed] = useState(initialFailed);
  const [pending, startTransition] = useTransition();

  const isolate = (s: string) => (loc === "ar" ? `⁦${s}⁩` : s);
  const num = (n: number | undefined) => formatNumber(n ?? 0, loc);

  const errorText = (e: DetailsError | undefined): string | undefined => {
    if (!e) return undefined;
    if (e.code === "phoneLength") {
      const args = {
        country: t(`countries.${e.country ?? "SA"}`),
        code: isolate(e.dialCode ?? ""),
        min: num(e.min),
        max: num(e.max),
        count: num(e.count),
      };
      return e.min === e.max ? t("errors.phoneLengthExact", args) : t("errors.phoneLengthRange", args);
    }
    if (e.code === "nameShort") return t("errors.nameShort", { min: e.min ?? 0, minLabel: num(e.min) });
    return t(`errors.${e.code}`, { max: num(e.max) });
  };

  /** Re-check `field`; the two names share the "at least one" rule, so a name also re-checks its partner when that shows an error. */
  const recheck = (next: DetailsInput, field: DetailsField) => {
    setErrors((current) => {
      const out: DetailsErrors = { ...current };
      const names: DetailsField[] = ["nameAr", "nameEn"];
      const touched = names.includes(field) ? names : [field];
      for (const f of touched) {
        if (f === field || out[f]) {
          const problem = checkDetailsField(f, next);
          // The pair rule shows on one field only: the one being typed in, or the Arabic field on submit.
          if (problem?.code === "nameMissing" && f !== field) delete out[f];
          else out[f] = problem;
        }
      }
      return out;
    });
  };

  const bind = (field: DetailsField) => ({
    id: fieldId(field),
    name: field,
    value: values[field],
    invalid: Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${fieldId(field)}-error` : `${fieldId(field)}-hint`,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = { ...values, [field]: e.target.value };
      setValues(next);
      if (!typedIn[field]) setTypedIn((d) => ({ ...d, [field]: true }));
      const names: DetailsField[] = ["nameAr", "nameEn"];
      const shown = errors[field] || (names.includes(field) && names.some((n) => errors[n]?.code === "nameMissing"));
      if (shown) recheck(next, field);
    },
    onBlur: () => {
      if (typedIn[field]) recheck(values, field);
    },
  });

  const focusFirst = (found: DetailsErrors) => {
    const first = DETAILS_FIELDS.find((f) => found[f]);
    if (first) document.getElementById(fieldId(first))?.focus();
    return Boolean(first);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = checkDetails(values);
    setErrors(found);
    if (focusFirst(found)) return;
    const previous = saved;
    const submitted = values;
    startTransition(async () => {
      const result: SaveDetailsResult = await saveDetails(submitted).catch(() => ({ ok: false, error: "unavailable" }) as const);
      if (result.ok) {
        setFailed(false);
        onSavedChange(submitted);
        notify(t("toast.detailsSaved"), () => {
          setValues(previous);
          setErrors({});
          onSavedChange(previous);
          void saveDetails(previous).catch(() => undefined);
        });
      } else if (result.error === "validation") {
        setErrors(result.fields);
        focusFirst(result.fields);
      } else {
        setFailed(true);
      }
    });
  };

  return (
    <Group id="details" title={t("details.title")} lead={t("details.lead")}>
      <form noValidate onSubmit={onSubmit} aria-labelledby="details-title" aria-busy={pending || undefined} className="flex flex-col gap-5">
        <fieldset className="flex min-w-0 flex-col gap-4">
          <legend className="mb-1 text-[15px] font-semibold text-ink-900">{t("details.nameLegend")}</legend>
          <p id="settings-name-hint" className="text-sm text-ink-500">
            {t("details.nameHint")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={fieldId("nameAr")} label={t("details.nameAr")} error={errorText(errors.nameAr)}>
              <Input
                {...bind("nameAr")}
                aria-describedby={errors.nameAr ? `${fieldId("nameAr")}-error` : "settings-name-hint"}
                lang="ar"
                dir="rtl"
                autoComplete="name"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
              />
            </Field>
            <Field id={fieldId("nameEn")} label={t("details.nameEn")} error={errorText(errors.nameEn)}>
              <Input
                {...bind("nameEn")}
                aria-describedby={errors.nameEn ? `${fieldId("nameEn")}-error` : "settings-name-hint"}
                lang="en"
                dir="ltr"
                autoComplete="name"
                autoCorrect="off"
                autoCapitalize="words"
                spellCheck={false}
                enterKeyHint="next"
              />
            </Field>
          </div>
        </fieldset>

        <Field id={fieldId("email")} label={t("details.email")} hint={t("details.emailHint")} error={errorText(errors.email)}>
          <Input
            {...bind("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="next"
            dir="ltr"
          />
        </Field>

        <Field id={fieldId("phone")} label={t("details.phone")} hint={t("details.phoneHint")} error={errorText(errors.phone)}>
          <Input {...bind("phone")} type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="done" dir="ltr" className="tabular" />
        </Field>

        {failed ? (
          <div role="alert" className="rounded-[var(--radius-field)] border border-danger bg-white p-4">
            <p className="font-semibold text-danger">{t("details.failedTitle")}</p>
            <p className="mt-1 text-sm text-ink-700">{t("details.failedBody")}</p>
          </div>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full sm:w-auto sm:self-start">
          {pending ? t("details.saving") : failed ? t("details.retry") : t("details.save")}
        </Button>
      </form>
    </Group>
  );
}
