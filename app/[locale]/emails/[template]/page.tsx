// Screen 49: the eight transactional emails, previewed with sample data (dev only; the layout answers 404 in production builds).
// The email renders in the page's language: /ar/emails/otp is the Arabic code email, /en/emails/otp the English one. The
// envelope (sender, reply address, recipient, subject, preview text, attachment) sits beside the email; ?view=text shows the
// plain-text part, ?variant= the template's other samples, ?state=loading the loading frame. The email itself is the exact
// HTML that send.ts posts to Resend, in an iframe, so what is screenshotted here is what Gmail and Outlook receive.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { Chip, Surface, TabLinks } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { devRoleSwitchEnabled } from "@/lib/dev-role";
import { getTemplate, isTemplateName, templateNames, type TemplateName } from "@/lib/email-templates";
import { sampleEmailData, sampleRecipient, templateVariants } from "@/lib/email-templates/samples";
import { replyToFor, senderFor } from "@/lib/email-templates/send";
import type { Locale } from "@/lib/format";
import { EmailFrame } from "./_parts/EmailFrame";
import { PreviewSkeleton } from "./_parts/PreviewSkeleton";
import { previewHref, readQuery, type SearchParams } from "./_parts/preview";

type Props = { params: Promise<{ locale: string; template: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "email.preview" });
  return { title: t("metaTitle"), description: t("lead"), robots: { index: false, follow: false } };
}

export default async function EmailPreviewPage({ params, searchParams }: Props) {
  if (!devRoleSwitchEnabled) notFound();
  const { locale, template } = await params;
  if (!isTemplateName(template)) notFound();
  setRequestLocale(locale);
  const name: TemplateName = template;
  const query = readQuery(name, await searchParams);
  if (query.loading) return <PreviewSkeleton />;

  const loc = locale as Locale;
  const t = await getTranslations("email.preview");
  const email = getTemplate(name) as ReturnType<typeof getTemplate<TemplateName>>;
  const data = sampleEmailData(name, loc, query.variant) as never;
  // assetsBaseUrl "": the wordmark loads from this site, so the preview works on any host and port.
  const rendered = email.render(loc, data, { assetsBaseUrl: "" });
  const subject = email.subject(loc, data);
  const preheader = email.preheader(loc, data);
  const attachments = email.attachments(loc, data);
  const label = t(`names.${name}`);
  const dir = loc === "ar" ? "rtl" : "ltr";
  const variants = templateVariants[name] as readonly string[];

  const envelope: Array<{ key: string; value: React.ReactNode }> = [
    { key: "from", value: <span className="ltr-run wrap-anywhere">{senderFor()}</span> },
    { key: "replyTo", value: <span className="ltr-run wrap-anywhere">{replyToFor()}</span> },
    { key: "to", value: <span className="ltr-run wrap-anywhere">{sampleRecipient(name, query.variant)}</span> },
    { key: "subject", value: <span className="font-semibold text-ink-900">{subject}</span> },
    { key: "preheader", value: preheader },
    ...attachments.map((a) => ({ key: "attachment", value: <span className="ltr-run wrap-anywhere">{a.filename}</span> })),
  ];

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <h1 className="text-3xl font-bold text-sea-900 sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-lg text-ink-700">{t("lead")}</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <nav aria-labelledby="email-templates-title">
              <h2 id="email-templates-title" className="mb-2 text-sm font-semibold text-ink-700">
                {t("templates")}
              </h2>
              <ul className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
                {templateNames.map((n) => (
                  <li key={n}>
                    <Link href={previewHref(n, { view: query.view })} aria-current={n === name ? "page" : undefined} className="inline-flex rounded-[var(--radius-tag)]">
                      <Chip tone={n === name ? "lagoon" : "sand"}>{t(`names.${n}`)}</Chip>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <Surface>
              <h2 className="mb-3 text-sm font-semibold text-ink-700">{t("envelope.label")}</h2>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                {envelope.map((row, i) => (
                  <div key={`${row.key}-${i}`} className="contents">
                    <dt className="font-semibold text-ink-700">{t(`envelope.${row.key}`)}</dt>
                    <dd className="min-w-0 break-words text-ink-700">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </Surface>
          </div>

          <section aria-labelledby="email-preview-title" className="flex min-w-0 flex-col gap-4">
            <h2 id="email-preview-title" className="text-xl font-bold text-sea-900 sm:text-2xl">
              {label}
            </h2>
            <TabLinks
              label={t("view")}
              scroll={false}
              items={[
                { href: previewHref(name, { variant: query.variant }), label: t("html"), current: query.view === "html" },
                { href: previewHref(name, { view: "text", variant: query.variant }), label: t("text"), current: query.view === "text" },
              ]}
            />
            {variants.length > 1 ? (
              <nav aria-label={t("variant")} className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink-700">{t("variant")}</span>
                {variants.map((v) => (
                  <Link
                    key={v}
                    href={previewHref(name, { view: query.view, variant: v })}
                    scroll={false}
                    aria-current={v === query.variant ? "page" : undefined}
                    className="inline-flex rounded-[var(--radius-tag)]"
                  >
                    <Chip tone={v === query.variant ? "lagoon" : "sand"}>{t(`variants.${name}.${v}`)}</Chip>
                  </Link>
                ))}
              </nav>
            ) : null}

            {query.view === "text" ? (
              <pre
                lang={loc}
                dir={dir}
                aria-label={t("textTitle", { name: label })}
                className="whitespace-pre-wrap break-words rounded-[var(--radius-card)] border border-sand-200 bg-white p-5 text-start font-sans text-base leading-relaxed text-ink-900"
              >
                {rendered.text}
              </pre>
            ) : (
              <EmailFrame html={rendered.html} title={t("frameTitle", { name: label })} />
            )}
          </section>
        </div>
      </main>
    </>
  );
}
