// Blocks of screen 11 shared by page.tsx and loading.tsx, so the loading frame is the real page with skeletons in place of the
// parts that wait (rule L1). Plain server components: useTranslations works in both the page and the loading boundary.
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Badge, Field, Skeleton, Surface } from "@/components/ui";
import { AI_TOOLS, type AiTool } from "./tools";

/** Title and one line of intent (rule X1: main message first, grade 6; H3: front-loaded). */
export function AiToolsHeader() {
  const t = useTranslations("aiTools");
  return (
    <header className="max-w-3xl">
      <Badge tone="info">{t("badge")}</Badge>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-sea-900 sm:text-4xl">{t("title")}</h1>
      <p className="mt-3 text-lg text-ink-700">{t("intent")}</p>
    </header>
  );
}

/** The ten tools, name and one line each, in a muted two-column list; no prices (brief). The two that ship inside the records
 *  summary at launch sit under their own heading so the list never calls them "coming soon". */
export function ToolList({ skeleton = false }: { skeleton?: boolean }) {
  const t = useTranslations("aiTools");
  const tiles = (group: AiTool["group"]) =>
    AI_TOOLS.filter((tool) => tool.group === group).map((tool) => (
      <li key={tool.key} className="flex flex-col gap-1.5 rounded-[var(--radius-field)] border border-sand-200 bg-sand-100 p-4">
        <h3 className="font-semibold leading-snug text-ink-900">{t(`tools.${tool.key}.name`)}</h3>
        {skeleton ? (
          <>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </>
        ) : (
          <p className="text-ink-700">{t(`tools.${tool.key}.line`)}</p>
        )}
      </li>
    ));
  return (
    <div className="flex flex-col gap-6" aria-busy={skeleton || undefined}>
      <section aria-labelledby="ai-tools-later">
        <h2 id="ai-tools-later" className="sr-only">
          {t("listLabel")}
        </h2>
        <ul className="grid grid-cols-2 gap-3">{tiles("later")}</ul>
      </section>
      <section aria-labelledby="ai-tools-records">
        <h2 id="ai-tools-records" className="mb-3 font-semibold text-ink-700">
          {t("inRecordsSummary")}
        </h2>
        <ul className="grid grid-cols-2 gap-3">{tiles("records")}</ul>
      </section>
    </div>
  );
}

/** The one CTA: tell me when these launch. The form (or its skeleton) goes in as children. */
export function NotifyPanel({ children }: { children: ReactNode }) {
  const t = useTranslations("aiTools.notify");
  return (
    <Surface className="shadow-[var(--shadow-nav)]">
      <h2 id="ai-tools-notify" className="text-xl font-bold text-sea-900">
        {t("title")}
      </h2>
      <p className="mb-4 mt-1 text-ink-700">{t("body")}</p>
      {children}
    </Surface>
  );
}

export function NotifySkeleton() {
  const t = useTranslations("aiTools.notify");
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Field id="launch-notice-email-loading" label={t("label")}>
        <Skeleton className="min-h-12 rounded-[var(--radius-field)]" />
      </Field>
      <Skeleton className="min-h-14 rounded-[var(--radius-field)]" />
    </div>
  );
}

/** Rules T4 and T5: every AI result is labelled and shows its review state; not a diagnosis, not a replacement for the visit. */
export function SafetyNote() {
  const t = useTranslations("aiTools.safety");
  return (
    <div className="rounded-[var(--radius-card)] bg-sky-100 p-5">
      <h2 className="text-lg font-bold text-sea-900">{t("title")}</h2>
      <p className="mt-2 text-ink-700">{t("body")}</p>
    </div>
  );
}
