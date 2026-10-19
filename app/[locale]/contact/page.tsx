// Screen 15, Contact (docs/screens/15-contact.md). Two stacked choices: WhatsApp click-to-chat first (G3), then the three-field
// email form (F1 F4 F5 F8 L4); entity, address and hours under them (H9). On desktop the form takes the end column.
// States: default form; ?state=sent (reply promise); ?state=invalid (specific field errors); ?state=error (send failed, input
// kept); ?state=loading (skeleton). Viewer: ?country= picks the emergency number, ?tz= shows the hours in the viewer's zone.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Surface } from "@/components/ui";
import { business } from "@/config/business";
import { formatNumber, formatTimeRangeInZone, instantAtHourInZone, type Locale } from "@/lib/format";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import { ContactForm, type ContactStatus } from "./ContactForm";
import { WhatsAppCard, whatsAppHref } from "./WhatsAppCard";
import { validateContact, type ContactErrors, type ContactInput } from "./validation";
import ContactLoading from "./loading";

// Synthetic inputs for the state previews only.
const DEMO_EMAIL = "sara@example.com";
const DEMO_EMAIL_NO_DOT = "sara@example";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function replyLabel(locale: string) {
  const t = await getTranslations({ locale, namespace: "contact" });
  const days = business.supportReplyWorkingDays;
  return t("reply", { days, count: formatNumber(days, locale as Locale) });
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("metaTitle"), description: t("metaDescription", { reply: await replyLabel(locale) }) };
}

export default async function ContactPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const sp = await searchParams;
  const state = typeof sp.state === "string" ? sp.state : undefined;
  if (state === "loading") return <ContactLoading />;

  const viewer = viewerFrom(sp);
  const t = await getTranslations("contact");
  const tc = await getTranslations("common");
  const tf = await getTranslations("footer");
  const reply = await replyLabel(locale);

  const opens = instantAtHourInZone(business.supportOpenHour, business.defaultTimeZone);
  const closes = instantAtHourInZone(business.supportCloseHour, business.defaultTimeZone);
  const hours = formatTimeRangeInZone(opens, closes, viewer.timeZone, loc);

  const demo: ContactInput = { name: t("demo.name"), email: DEMO_EMAIL, message: t("demo.message") };
  let initialValues: ContactInput = { name: "", email: "", message: "" };
  let initialErrors: ContactErrors = {};
  let initialStatus: ContactStatus = "form";
  if (state === "sent") {
    initialValues = demo;
    initialStatus = "sent";
  } else if (state === "error") {
    initialValues = demo;
    initialStatus = "failed";
  } else if (state === "invalid") {
    initialValues = { name: "", email: DEMO_EMAIL_NO_DOT, message: t("demo.shortMessage") };
    initialErrors = validateContact(initialValues);
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-bold text-sea-900 sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-lg text-ink-700">{t("lead")}</p>
          <p className="mt-3 text-sm text-ink-700">{tc("notForEmergenciesWithNumber", { number: emergencyNumberFor(viewer.country) })}</p>
        </header>

        <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:grid-rows-[auto_1fr] md:items-start">
          <WhatsAppCard className="md:col-start-1 md:row-start-1" />

          <Surface className="md:col-start-2 md:row-start-1 md:row-span-2">
            <ContactForm
              key={state ?? "form"}
              initialValues={initialValues}
              initialErrors={initialErrors}
              initialStatus={initialStatus}
              replyLabel={reply}
              whatsappHref={whatsAppHref(t("whatsapp.greeting"))}
            />
          </Surface>

          <Surface className="md:col-start-1 md:row-start-2">
            <section aria-labelledby="visit-title">
              <h2 id="visit-title" className="text-lg font-bold text-sea-900">
                {t("visit.title")}
              </h2>
              <dl className="mt-3 space-y-4">
                <div>
                  <dt className="text-sm font-semibold text-ink-500">{t("visit.hours")}</dt>
                  <dd className="mt-0.5 text-ink-900">{t("visit.days")}</dd>
                  <dd className="text-ink-900">
                    <span className="tabular">{hours.range}</span> <span className="ltr-run">{hours.zone}</span>
                  </dd>
                  <dd className="mt-1 text-sm text-ink-700">{t("visit.closed")}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-ink-500">{t("visit.address")}</dt>
                  <dd className="mt-0.5">
                    <address className="not-italic text-ink-900">
                      <span className="block">{tf("entity")}</span>
                      <span className="block">{tf("address")}</span>
                    </address>
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-ink-700">{t("visit.afterHours")}</p>
            </section>
          </Surface>
        </div>
      </main>
      <SiteFooter emergencyNumber={emergencyNumberFor(viewer.country)} />
    </>
  );
}
