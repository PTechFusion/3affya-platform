// Booking page loading state (rule L1): the page frame with its real labels (your time, the doctor's time, add to calendar,
// the three prepare items, share your records, receipt) and skeleton values where the booking's data goes. The page renders
// this for ?state=loading too.
import { useTranslations } from "next-intl";
import { Skeleton, Surface } from "@/components/ui";

const sectionTitle = "text-lg font-bold text-sea-900";

export default function Loading() {
  const t = useTranslations("booking");
  const tp = useTranslations("portal");
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <header>
        <p className="text-sm font-semibold text-sea-700">{tp("patient.nav.bookings")}</p>
        <h1 className="mt-3 text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
        <p role="status" className="sr-only">
          {t("loading")}
        </p>
      </header>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <Surface>
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-2xl sm:size-14" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-field)] bg-sea-100 p-3">
                <p className="text-sm font-semibold text-sea-800">{t("card.yourTime")}</p>
                <Skeleton className="mt-1.5 h-5 w-1/2" />
                <Skeleton className="mt-1.5 h-8 w-3/4" />
                <Skeleton className="mt-1.5 h-4 w-2/5" />
              </div>
              <div className="rounded-[var(--radius-field)] bg-sand-100 p-3">
                <p className="text-sm font-semibold text-ink-700">{t("card.doctorTimeLoading")}</p>
                <Skeleton className="mt-1.5 h-4 w-4/5" />
              </div>
            </div>
            <div className="mt-4 border-t border-sand-200 pt-4">
              <Skeleton className="h-12 w-full rounded-[var(--radius-field)] sm:w-56" />
              <Skeleton className="mt-2 h-4 w-5/6" />
            </div>
          </Surface>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap rounded-[var(--radius-field)] border border-sand-300 bg-white px-5 py-3 text-[15px] font-semibold text-ink-500 sm:flex-none">
              {t("calendar.add")}
            </span>
            <span className="inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap px-5 py-3 text-[15px] font-semibold text-ink-500 sm:flex-none">{t("calendar.google")}</span>
          </div>

          <Surface>
            <h2 className={sectionTitle}>{t("prepare.title")}</h2>
            <p className="mt-1 text-sm text-ink-700">{t("prepare.lead")}</p>
            <ol className="mt-4 flex flex-col gap-4">
              {(["device", "room", "id"] as const).map((key) => (
                <li key={key} className={["flex items-start gap-3", key === "device" ? "rounded-[var(--radius-field)] bg-lagoon-100 p-3" : ""].join(" ")}>
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900">{t(`prepare.${key}.title`)}</p>
                    <Skeleton className="mt-1.5 h-4 w-4/5" />
                  </div>
                </li>
              ))}
            </ol>
          </Surface>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Surface>
            <h2 className={sectionTitle}>{t("share.titleLoading")}</h2>
            <div className="mt-2 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <Skeleton className="mt-4 h-12 w-full rounded-[var(--radius-field)] sm:w-40" />
          </Surface>
          <div className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-5">
            <p className="font-bold text-sea-900">{t("receipt.title")}</p>
            <Skeleton className="mt-1.5 h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}
