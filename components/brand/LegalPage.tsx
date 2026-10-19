// Screen 16: the one template for the four legal pages (privacy, terms, fees, refunds). Draft flag, title, effective and
// last-reviewed dates (rule X4), a four-line plain summary box (the hook), then numbered sections. The in-page contents list
// is sticky beside the text on desktop and a closed disclosure under the summary on phone. Text arrives already translated.
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Badge, ChevronDown, ChevronNext, LinkButton, Skeleton, Surface } from "@/components/ui";
import { formatDate, formatNumber, type Locale } from "@/lib/format";

export type LegalBlock = { kind: "para" | "item"; text: string };
/** One numbered section. `note` is an open question for counsel or Dr Ayman; `extra` is a table or links under the text. */
export type LegalSection = { id: string; title: string; blocks: LegalBlock[]; note?: string; extra?: ReactNode };

type Props = {
  title: string;
  summary: string[];
  sections: LegalSection[];
  lastReviewed: Date;
  /** Unset while the text is a draft; the header then says it is not yet in force. */
  effectiveOn?: Date;
  draft?: boolean;
  related: Array<{ href: string; label: string }>;
  emergencyNumber: string;
};

// Calendar dates carry no time of day, so they are formatted in UTC: the same date for every viewer.
const calendarDate = (d: Date, locale: Locale) => formatDate(d, "UTC", locale);

export function LegalPage({ title, summary, sections, lastReviewed, effectiveOn, draft, related, emergencyNumber }: Props) {
  const t = useTranslations("legal");
  const locale = useLocale() as Locale;
  const contents = (
    <ol className="space-y-0.5">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="flex gap-2 rounded-[var(--radius-field)] px-2 py-1.5 text-ink-700 hover:bg-sand-100 hover:text-sea-700"
          >
            <span className="tabular w-5 shrink-0 font-semibold text-lagoon-800">{formatNumber(i + 1, locale)}</span>
            <span>{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <LegalHeader title={title} draft={draft}>
          <dl className="flex flex-wrap gap-x-5 gap-y-1">
            <div>
              <dt className="inline font-semibold">{t("effective")}</dt>{" "}
              <dd className="inline">{effectiveOn ? calendarDate(effectiveOn, locale) : t("effectiveDraft")}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">{t("lastReviewed")}</dt>{" "}
              <dd className="inline">{calendarDate(lastReviewed, locale)}</dd>
            </div>
          </dl>
        </LegalHeader>

        <div className="mt-6 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">
            <nav aria-label={t("contents")} className="sticky top-28">
              <h2 className="mb-2 px-2 text-sm font-semibold text-ink-500">{t("contents")}</h2>
              {contents}
            </nav>
          </aside>

          <div className="min-w-0 max-w-3xl">
            <section aria-labelledby="legal-summary" className="rounded-[var(--radius-card)] bg-sky-100 p-5 sm:p-6">
              <h2 id="legal-summary" className="text-lg font-bold text-sea-900">
                {t("summaryTitle")}
              </h2>
              <ul className="mt-3 space-y-2.5">
                {summary.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-ink-900">
                    <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-lagoon-600" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <details className="group mt-4 rounded-[var(--radius-card)] border border-sand-200 bg-white lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-semibold text-ink-900">
                {t("contents")}
                <ChevronDown className="size-4 shrink-0 text-sea-700 transition-transform group-open:rotate-180" />
              </summary>
              <nav aria-label={t("contents")} className="px-3 pb-4">
                {contents}
              </nav>
            </details>

            <div className="mt-2">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="border-b border-sand-200 py-8">
                  <h2 id={`${s.id}-title`} className="flex items-start gap-3 text-xl font-bold text-sea-900 sm:text-2xl">
                    <span className="tabular inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-base text-lagoon-900">
                      {formatNumber(i + 1, locale)}
                    </span>
                    <span className="pt-0.5">{s.title}</span>
                  </h2>
                  <LegalBlocks blocks={s.blocks} />
                  {s.extra ? <div className="mt-5">{s.extra}</div> : null}
                  {s.note ? (
                    <div role="note" className="mt-5 rounded-[var(--radius-field)] border border-dashed border-sand-400 bg-sand-100 p-4 text-ink-700">
                      <Badge tone="warning">{t("noteLabel")}</Badge>
                      <p className="mt-2">{s.note}</p>
                    </div>
                  ) : null}
                </section>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Surface>
                <h2 className="text-lg font-bold text-sea-900">{t("questionsTitle")}</h2>
                <p className="mt-1 text-ink-700">{t("questionsBody")}</p>
                <div className="mt-4">
                  <LegalContactLinks />
                </div>
              </Surface>
              <nav aria-labelledby="legal-related" className="rounded-[var(--radius-card)] border border-sand-200 p-5">
                <h2 id="legal-related" className="text-lg font-bold text-sea-900">
                  {t("relatedTitle")}
                </h2>
                <ul className="mt-2 space-y-1">
                  {related.map((r) => (
                    <li key={r.href}>
                      <Link href={r.href} className="inline-flex min-h-10 items-center gap-1 font-semibold text-sea-700 hover:underline">
                        {r.label} <ChevronNext />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter emergencyNumber={emergencyNumber} />
    </>
  );
}

/** Contact page and email, for the complaints contact (rule T9) and the questions box. Same address as the footer. */
export function LegalContactLinks() {
  const t = useTranslations("legal");
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <LinkButton href="/contact" variant="secondary">
        {t("contactLink")}
      </LinkButton>
      <a href="mailto:hello@3affya.com" className="ltr-run font-semibold text-sea-700 underline-offset-2 hover:underline">
        hello@3affya.com
      </a>
    </div>
  );
}

/** Loading state (rule L1): the real frame, the real title and labels, content-shaped skeletons for the text. */
export function LegalPageSkeleton({ title }: { title: string }) {
  const t = useTranslations("legal");
  return (
    <>
      <SiteNav />
      <main aria-busy="true" className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <LegalHeader title={title} badge={<Skeleton className="h-7 w-44 rounded-[var(--radius-tag)]" />}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-2">
              <span className="font-semibold">{t("effective")}</span>
              <Skeleton className="h-4 w-24" />
            </span>
            <span className="flex items-center gap-2">
              <span className="font-semibold">{t("lastReviewed")}</span>
              <Skeleton className="h-4 w-24" />
            </span>
          </div>
        </LegalHeader>
        <div className="mt-6 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">
            <p className="mb-3 px-2 text-sm font-semibold text-ink-500">{t("contents")}</p>
            <div className="space-y-3 px-2">
              {["w-5/6", "w-2/3", "w-4/5", "w-3/5", "w-3/4", "w-2/3"].map((w, i) => (
                <Skeleton key={i} className={`h-4 ${w}`} />
              ))}
            </div>
          </aside>
          <div className="min-w-0 max-w-3xl">
            <section className="rounded-[var(--radius-card)] bg-sky-100 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-sea-900">{t("summaryTitle")}</h2>
              <div className="mt-4 space-y-3.5">
                {["w-full", "w-11/12", "w-full", "w-4/5"].map((w, i) => (
                  <Skeleton key={i} className={`h-4 ${w}`} />
                ))}
              </div>
            </section>
            <div className="mt-4 flex min-h-12 items-center rounded-[var(--radius-card)] border border-sand-200 bg-white px-5 font-semibold text-ink-900 lg:hidden">
              {t("contents")}
            </div>
            {[0, 1, 2].map((n) => (
              <div key={n} className="border-b border-sand-200 py-8">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

function LegalHeader({ title, draft, badge, children }: { title: string; draft?: boolean; badge?: ReactNode; children: ReactNode }) {
  const t = useTranslations("legal");
  return (
    <header className="max-w-3xl">
      {draft ? <Badge tone="warning">{t("draftBadge")}</Badge> : badge}
      <h1 className="mt-3 text-3xl font-bold text-sea-900 sm:text-4xl">{title}</h1>
      <div className="mt-3 text-sm text-ink-700">{children}</div>
      {draft ? <p className="mt-2 text-sm text-ink-500">{t("draftNote")}</p> : null}
    </header>
  );
}

/** Paragraphs and bullet items in message order; consecutive items share one list. */
function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  const groups: Array<{ kind: "para"; text: string } | { kind: "list"; items: string[] }> = [];
  for (const b of blocks) {
    const last = groups[groups.length - 1];
    if (b.kind === "para") groups.push({ kind: "para", text: b.text });
    else if (last?.kind === "list") last.items.push(b.text);
    else groups.push({ kind: "list", items: [b.text] });
  }
  return (
    <div className="mt-3 space-y-3 text-ink-700">
      {groups.map((g, i) =>
        g.kind === "para" ? (
          <p key={i}>{g.text}</p>
        ) : (
          <ul key={i} className="list-disc space-y-2 ps-5 marker:text-lagoon-600">
            {g.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
