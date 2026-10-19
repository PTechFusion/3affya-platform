// Screen 36, shared summaries (docs/screens/36-shared-summaries.md, task 3.10). The records summaries patients shared with the
// signed-in professional, newest first. Above the fold: the list. Each row: patient first name, the AI label and reviewed state
// carried through (rule T4), shared on, expires on with the days left (rule T7), Open.
// States: default (three sample shares for doc_002); ?state=empty (no shares, one action); ?state=loading (skeleton, same as
// loading.tsx). The viewer is /professional/shared/[id]: sh_001 new, sh_002 viewed, sh_003 reviewed. Time zone via ?tz=.
// The (list) group keeps this route's loading.tsx off the viewer, so the viewer's share check can still answer a real 404.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, ChevronNext, EmptyState, LinkButton, Surface } from "@/components/ui";
import { business } from "@/config/business";
import { formatDate, formatNumber, type Locale } from "@/lib/format";
import { sampleProfessional, sampleProfessionalId, sharesFor } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import { SharedListSkeleton } from "../_parts/SharedListSkeleton";
import { daysLeft, shareStatusTone } from "../_parts/status";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shared" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function SharedSummariesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  if (sp.state === "loading") return <SharedListSkeleton />;

  // The doctor reads these dates about their own work: their zone, unless ?tz= says otherwise.
  const timeZone = typeof sp.tz === "string" ? viewerFrom(sp).timeZone : sampleProfessional.timeZone;
  const t = await getTranslations("shared");
  const ts = await getTranslations("summary");
  const counted = (n: number) => ({ count: n, label: formatNumber(n, loc) });
  const now = new Date();
  const shares = sp.state === "empty" ? [] : sharesFor(sampleProfessionalId, now);

  return (
    <>
      <h1 className="text-2xl font-bold text-sea-900 sm:text-3xl">{t("title")}</h1>
      <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead", { days: t("days", counted(business.shareDefaultDays)) })}</p>

      {shares.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t("empty.title")}
            body={t("empty.body")}
            action={<LinkButton href="/professional/inbox">{t("empty.action")}</LinkButton>}
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {shares.map((share) => {
            const { patient, data } = share.summary;
            const name = loc === "ar" ? patient.firstNameAr : patient.firstNameEn;
            const pages = data.documents.reduce((n, d) => n + d.pages, 0);
            const left = daysLeft(share.expiresAt, now);
            return (
              <li key={share.id}>
                <Surface className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_11rem_auto] sm:items-center sm:gap-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-sea-900">{name}</h2>
                      <Badge tone={shareStatusTone[share.status]}>{t(`status.${share.status}`)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-700">
                      {t("rowAi", { files: ts("files", counted(data.documents.length)), pages: ts("pages", counted(pages)) })}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 sm:contents">
                    <div>
                      <dt className="text-sm text-ink-500">{t("sharedOn")}</dt>
                      <dd className="font-semibold text-ink-900">{formatDate(share.sharedAt, timeZone, loc)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-ink-500">{t("expiresOn")}</dt>
                      <dd className="font-semibold text-ink-900">{formatDate(share.expiresAt, timeZone, loc)}</dd>
                      <dd className="text-sm text-ink-700">{t("daysLeft", counted(left))}</dd>
                    </div>
                  </dl>
                  <LinkButton
                    href={`/professional/shared/${share.id}`}
                    variant={share.status === "new" ? "primary" : "secondary"}
                    aria-label={t("openLabel", { name })}
                    className="w-full sm:w-auto"
                  >
                    {t("open")}
                    <ChevronNext />
                  </LinkButton>
                </Surface>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
