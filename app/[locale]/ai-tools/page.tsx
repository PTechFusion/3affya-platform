// Screen 11, AI tools coming soon (docs/screens/11-ai-tools-coming-soon.md). Title, one line of intent, the ten tools in a muted
// two-column list, one CTA (tell me when these launch), and the AI labelling promise (rules T4, T5). No prices anywhere.
// States: default; ?state=loading (skeleton); ?state=error (the email field showing an error); ?step=sent (signed up).
// Viewer country via ?country= for the footer emergency line (default SA).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { emergencyNumberFor, viewerFrom } from "@/lib/viewer";
import type { LaunchNoticeResult } from "./actions";
import { NotifyForm } from "./_parts/NotifyForm";
import { AiToolsHeader, NotifyPanel, NotifySkeleton, SafetyNote, ToolList } from "./_parts/sections";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aiTools" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function AiToolsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const loading = sp.state === "loading";
  const emergency = emergencyNumberFor(viewerFrom(sp).country);

  // Review states for the form, so the error and the signed-up view open without typing.
  const initial: LaunchNoticeResult | null =
    sp.step === "sent" ? { ok: true } : sp.state === "error" ? { ok: false, error: "noDomain" } : null;
  const initialEmail = sp.state === "error" ? "name@" : "";

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <AiToolsHeader />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
          <ToolList skeleton={loading} />
          <div className="flex flex-col gap-6 lg:sticky lg:top-28">
            <NotifyPanel>{loading ? <NotifySkeleton /> : <NotifyForm initial={initial} initialEmail={initialEmail} />}</NotifyPanel>
            <SafetyNote />
          </div>
        </div>
      </main>
      <SiteFooter emergencyNumber={emergency} />
    </>
  );
}
