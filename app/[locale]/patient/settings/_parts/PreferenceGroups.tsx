"use client";
// The four preference groups of the layout call: Language, Time zone, Calendar and Emails. Each change applies at once, saves in
// the background and offers Undo (rule B10); a failed save puts the old value back and says so. Language is named in its own
// script (H10) and reloads the page in that language; zones come GCC first and are named by city and country (P6); Gregorian
// stays the calendar, Hijri is an optional second date (N3); emails never carry health details (T12).
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, CheckCard, Field, SegmentedControl, Select } from "@/components/ui";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { PatientEmailKey } from "@/lib/sample";
import { savePreference } from "../actions";
import { Group } from "./Group";
import type { ZoneGroup } from "./model";
import type { Notify } from "./SettingsScreen";

type Preference =
  | { kind: "locale"; value: "ar" | "en" }
  | { kind: "timeZone"; value: string }
  | { kind: "hijri"; value: boolean }
  | { kind: "email"; key: PatientEmailKey; value: boolean };

const unavailable = { ok: false as const, error: "unavailable" as const };

/** Apply, save, offer Undo; on a failed save, put the old value back and say so. Undo saves the old value the same way. */
function useAutoSave(notify: Notify) {
  const t = useTranslations("settings");
  return function change<V>(set: (v: V) => void, from: V, to: V, pref: (v: V) => Preference, message: string) {
    set(to);
    void savePreference(pref(to))
      .catch(() => unavailable)
      .then((result) => {
        if (!result.ok) {
          set(from);
          notify(t("toast.failed"));
          return;
        }
        notify(message, () => {
          set(from);
          void savePreference(pref(from))
            .catch(() => unavailable)
            .then((back) => {
              if (!back.ok) {
                set(to);
                notify(t("toast.failed"));
              }
            });
        });
      });
  };
}

export function LanguageGroup() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const locale = useLocale() as "ar" | "en";
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(locale);
  const [, startTransition] = useTransition();

  // The page language is the URL; the saved preference is the language of emails. Switching reloads this page in the new
  // language whatever the save answers, so the patient is never stuck in a language they cannot read.
  const choose = (next: "ar" | "en") => {
    setValue(next);
    startTransition(async () => {
      await savePreference({ kind: "locale", value: next }).catch(() => unavailable);
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <Group id="language" title={t("language.title")}>
      <SegmentedControl
        legend={t("language.legend")}
        name="settings-language"
        value={value}
        onChange={choose}
        options={[
          { value: "ar", label: tc("arabic"), lang: "ar" },
          { value: "en", label: tc("english"), lang: "en" },
        ]}
      />
    </Group>
  );
}

export function TimeZoneGroup({ zoneGroups, initial, notify }: { zoneGroups: ZoneGroup[]; initial: string; notify: Notify }) {
  const t = useTranslations("settings");
  const change = useAutoSave(notify);
  const [timeZone, setTimeZone] = useState(initial);
  const zones = zoneGroups.flatMap((g) => g.zones);
  const current = zones.find((z) => z.timeZone === timeZone);
  const id = "settings-time-zone";

  return (
    <Group id="timeZone" title={t("timeZone.title")}>
      <Field id={id} label={t("timeZone.label")} hint={t("timeZone.hint")}>
        <Select
          id={id}
          value={timeZone}
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            const next = e.target.value;
            const label = zones.find((z) => z.timeZone === next)?.label ?? next;
            change(setTimeZone, timeZone, next, (value) => ({ kind: "timeZone", value }), t("toast.zone", { zone: label }));
          }}
        >
          {zoneGroups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.zones.map((z) => (
                <option key={z.timeZone} value={z.timeZone}>
                  {z.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      {current ? (
        <p className="text-ink-700">
          {t.rich("timeZone.now", {
            time: current.now,
            strong: (chunks) => <span className="tabular whitespace-nowrap font-semibold text-ink-900">{chunks}</span>,
          })}
        </p>
      ) : null}
    </Group>
  );
}

export function CalendarGroup({ initial, example, notify }: { initial: boolean; example: string; notify: Notify }) {
  const t = useTranslations("settings");
  const change = useAutoSave(notify);
  const [hijri, setHijri] = useState(initial);
  return (
    <Group id="calendar" title={t("calendar.title")} lead={t("calendar.lead")}>
      <CheckCard
        id="settings-hijri"
        title={t("calendar.hijri")}
        description={t("calendar.example", { date: example })}
        checked={hijri}
        onChange={(e) => {
          const next = e.target.checked;
          change(setHijri, hijri, next, (value) => ({ kind: "hijri", value }), t(next ? "toast.hijriOn" : "toast.hijriOff"));
        }}
      />
    </Group>
  );
}

const EMAIL_KEYS: PatientEmailKey[] = ["summaryReady", "shareOpened", "news"];

export function EmailsGroup({ initial, email, notify }: { initial: Record<PatientEmailKey, boolean>; email: string; notify: Notify }) {
  const t = useTranslations("settings");
  const change = useAutoSave(notify);
  const [emails, setEmails] = useState(initial);

  return (
    <Group
      id="emails"
      title={t("emails.title")}
      lead={t.rich("emails.lead", { email, address: (chunks) => <span className="ltr-run font-semibold text-ink-900">{chunks}</span> })}
    >
      {/* Booking emails carry the visit link, so they cannot be turned off: a plain row with its reason, not a dead checkbox. */}
      <div className="rounded-[var(--radius-field)] border border-sand-300 bg-sand-50 p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-semibold text-ink-900">{t("emails.bookings.title")}</p>
          <Badge tone="info">{t("emails.alwaysOn")}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-ink-700">{t("emails.bookings.body")}</p>
      </div>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold text-ink-700">{t("emails.optional")}</legend>
        {EMAIL_KEYS.map((key) => (
          <CheckCard
            key={key}
            id={`settings-email-${key}`}
            title={t(`emails.${key}.title`)}
            description={t(`emails.${key}.body`)}
            checked={emails[key]}
            onChange={(e) => {
              const next = e.target.checked;
              const title = t(`emails.${key}.title`);
              change(
                (v: boolean) => setEmails((all) => ({ ...all, [key]: v })),
                emails[key],
                next,
                (value) => ({ kind: "email", key, value }),
                t(next ? "toast.emailOn" : "toast.emailOff", { title }),
              );
            }}
          />
        ))}
      </fieldset>

      <p className="text-sm text-ink-700">{t("emails.private")}</p>
    </Group>
  );
}
