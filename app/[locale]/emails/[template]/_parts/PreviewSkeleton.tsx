// Loading frame of the email preview (rule L1): the real title, lead, template names and envelope labels; the email itself is a
// content-shaped skeleton (wordmark, headline, lines, the key block, the button). Shared by loading.tsx and ?state=loading.
import { useTranslations } from "next-intl";
import { SiteNav } from "@/components/brand/SiteNav";
import { Chip, Skeleton, Surface } from "@/components/ui";
import { templateNames } from "@/lib/email-templates";

const ENVELOPE = ["from", "replyTo", "to", "subject", "preheader"] as const;

export function PreviewSkeleton() {
  const t = useTranslations("email.preview");
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <h1 className="text-3xl font-bold text-sea-900 sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-lg text-ink-700">{t("lead")}</p>
        <div role="status" aria-label={t("loading")} className="mt-8 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-700">{t("templates")}</p>
              <ul className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
                {templateNames.map((n) => (
                  <li key={n}>
                    <Chip>{t(`names.${n}`)}</Chip>
                  </li>
                ))}
              </ul>
            </div>
            <Surface>
              <p className="mb-3 text-sm font-semibold text-ink-700">{t("envelope.label")}</p>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 text-sm">
                {ENVELOPE.map((k) => (
                  <div key={k} className="contents">
                    <dt className="font-semibold text-ink-700">{t(`envelope.${k}`)}</dt>
                    <dd>
                      <Skeleton className="h-4 w-full" />
                    </dd>
                  </div>
                ))}
              </dl>
            </Surface>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <Skeleton className="h-7 w-48" />
            <div className="flex border-b border-sand-300 text-[15px] font-semibold text-ink-700" aria-hidden="true">
              <span className="flex min-h-12 flex-1 items-center justify-center px-5 sm:flex-none">{t("html")}</span>
              <span className="flex min-h-12 flex-1 items-center justify-center px-5 sm:flex-none">{t("text")}</span>
            </div>
            <div className="rounded-[var(--radius-card)] border border-sand-200 bg-sand-50 p-3 sm:p-6" aria-hidden="true">
              <div className="mx-auto flex max-w-[600px] flex-col gap-4 rounded-[var(--radius-card)] border border-sand-200 bg-white p-5 sm:p-8">
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-32 w-full rounded-[var(--radius-field)]" />
                <Skeleton className="h-12 w-48 rounded-[var(--radius-field)]" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
