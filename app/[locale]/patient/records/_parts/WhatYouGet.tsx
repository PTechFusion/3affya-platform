// "What you will get", as three lines, under the progress card (screen 25 layout call). Static copy, so the loading state shows
// it too. The note says it is written by AI from the documents only and is not a diagnosis (rule T5).
import { useTranslations } from "next-intl";
import { Surface } from "@/components/ui";

const LINES = ["overview", "timeline", "gaps"] as const;

export function WhatYouGet({ done, className }: { done: boolean; className?: string }) {
  const t = useTranslations("recordSet.get");
  return (
    <Surface className={className}>
      <h2 className="text-lg font-bold text-sea-900">{done ? t("titleDone") : t("title")}</h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {LINES.map((line) => (
          <li key={line} className="flex items-start gap-2.5">
            <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-lagoon-500" />
            <span className="text-ink-900">{t(line)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-sand-200 pt-3 text-sm text-ink-700">{t("note")}</p>
    </Surface>
  );
}
