// Settings loading state (rule L1): the real heading, group titles, field labels and option names in the layout call's order,
// with content-shaped skeletons only where the patient's own values go (language choice, zone, which options are on, name,
// email, phone, the retention lists). Never a spinner. The page renders this for ?state=loading too.
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui";
import { Group } from "./_parts/Group";

export default function Loading() {
  const t = useTranslations("settings");
  const field = (text: string) => (
    <div className="flex flex-col gap-1.5">
      <p className="text-[15px] font-semibold text-ink-900">{text}</p>
      <Skeleton className="h-12 w-full rounded-[var(--radius-field)]" />
    </div>
  );
  /** An option row as CheckCard draws it: the real title, the box and the line under it still loading. */
  const option = (title: string) => (
    <div key={title} className="flex items-start gap-2.5 rounded-[var(--radius-field)] border border-sand-300 bg-white p-3">
      <Skeleton className="mt-1 size-5 shrink-0 rounded" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-900">{title}</p>
        <Skeleton className="mt-1.5 h-3.5 w-3/4" />
      </div>
    </div>
  );
  const list = (title: string) => (
    <div className="rounded-[var(--radius-field)] bg-sand-50 p-3">
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <div className="mt-2 space-y-2">
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </div>
  );

  return (
    <div role="status" aria-busy="true" aria-label={t("loading")}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead")}</p>
      </header>
      {/* Same columns as the page, so nothing shifts when the content arrives; the desktop "On this page" column stays empty. */}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_12rem] xl:gap-8">
        <div className="flex min-w-0 flex-col gap-5">
          <Group id="language" title={t("language.title")}>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink-700">{t("language.legend")}</p>
              <Skeleton className="h-[54px] w-48 rounded-[var(--radius-tag)]" />
            </div>
          </Group>
          <Group id="timeZone" title={t("timeZone.title")}>
            {field(t("timeZone.label"))}
            <p className="-mt-2 text-sm text-ink-500">{t("timeZone.hint")}</p>
          </Group>
          <Group id="calendar" title={t("calendar.title")} lead={t("calendar.lead")}>
            {option(t("calendar.hijri"))}
          </Group>
          <Group id="emails" title={t("emails.title")}>
            {(["bookings", "summaryReady", "shareOpened", "news"] as const).map((k) => option(t(`emails.${k}.title`)))}
            <p className="text-sm text-ink-700">{t("emails.private")}</p>
          </Group>
          <Group id="details" title={t("details.title")} lead={t("details.lead")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {field(t("details.nameAr"))}
              {field(t("details.nameEn"))}
            </div>
            {field(t("details.email"))}
            {field(t("details.phone"))}
            <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-36" />
          </Group>
          <Group id="data" title={t("data.title")}>
            <div>
              <p className="text-lg font-bold text-ink-900">{t("data.downloadTitle")}</p>
              <p className="mt-1 text-ink-700">{t("data.downloadBody")}</p>
            </div>
            <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-48" />
          </Group>
          <Group id="delete" tone="danger" title={t("delete.title")} lead={t("delete.lead")}>
            {(["uploads", "account"] as const).map((k) => (
              <div key={k} className="flex flex-col gap-3">
                <p className="text-lg font-bold text-ink-900">{t(`delete.${k}.title`)}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {list(t("delete.removed"))}
                  {list(t("delete.kept"))}
                </div>
                <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-44" />
              </div>
            ))}
          </Group>
        </div>
      </div>
    </div>
  );
}
