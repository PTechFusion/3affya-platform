"use client";
// The publish checklist (rules B2 B3, task 2.4): what admin verifies first, then what can wait, then the review track
// (Submit, Under review, Live) and the one action. Starts partly ticked from the registry and says what is left; Submit for
// review stays disabled, with the reason in text, until every required item is done.
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckIcon, ChevronNext } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatNumber, type Locale } from "@/lib/format";
import { ITEM_STEP, LATER_ITEMS, REQUIRED_ITEMS, STEPS, type ChecklistKey, type MissingCode, type Stage, type StepId } from "./model";

type Props = {
  stage: Stage;
  missing: Partial<Record<ChecklistKey, MissingCode>>;
  registryKeys: ChecklistKey[];
  onGo: (step: StepId) => void;
  /** The action area under the track: Submit for review, the submitted line, or Save changes. */
  action: ReactNode;
};

export function Checklist({ stage, missing, registryKeys, onGo, action }: Props) {
  const t = useTranslations("builder.checklist");
  const locale = useLocale() as Locale;
  const n = (v: number) => formatNumber(v, locale);
  const track = trackFor(stage);

  const row = (key: ChecklistKey) => {
    const code = missing[key];
    const step = ITEM_STEP[key];
    const stepNo = n(STEPS.indexOf(step) + 1);
    const status = code ? t(`missing.${code}`) : registryKeys.includes(key) ? t("status.registry") : t("status.done");
    return (
      <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
        <Mark done={!code} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink-900">{t(`items.${key}`)}</span>
          <span className={["block text-sm", code ? "font-medium text-gold-700" : "text-ink-500"].join(" ")}>{status}</span>
        </span>
        {code === "npiMissing" ? (
          <Link href="/contact" className={goClass}>
            {t("contact")}
            <ChevronNext className="size-3.5" />
          </Link>
        ) : code ? (
          <button type="button" onClick={() => onGo(step)} aria-label={t("goLabel", { item: t(`items.${key}`), step: stepNo })} className={goClass}>
            {t("go", { step: stepNo })}
            <ChevronNext className="size-3.5" />
          </button>
        ) : null}
      </li>
    );
  };

  return (
    <section id="publish" aria-labelledby="publish-title" className="scroll-mt-64 rounded-[var(--radius-card)] border border-sand-200 bg-white p-4 sm:p-5 xl:scroll-mt-24">
      <h2 id="publish-title" tabIndex={-1} className="text-xl font-bold text-sea-900 outline-none">
        {t("title")}
      </h2>
      {track < 3 ? <p className="mt-1 text-sm text-ink-700">{t("lead")}</p> : null}

      <h3 className="mt-4 text-sm font-semibold text-ink-700">{t("required")}</h3>
      <ul className="mt-1 divide-y divide-sand-200 rounded-[var(--radius-field)] border border-sand-200 px-3">{REQUIRED_ITEMS.map(row)}</ul>
      <h3 className="mt-4 text-sm font-semibold text-ink-700">{t("later")}</h3>
      <ul className="mt-1 divide-y divide-sand-200 rounded-[var(--radius-field)] border border-sand-200 px-3">{LATER_ITEMS.map(row)}</ul>

      {/* The review track mirrors in RTL with the page (rule R2): Submit sits at the reading start. */}
      <ol aria-label={t("track.label")} className="mt-6 grid grid-cols-3 text-center text-sm">
        {(["submit", "review", "live"] as const).map((node, i) => {
          const state = i < track ? "done" : i === track ? "current" : "todo";
          return (
            <li key={node} aria-current={state === "current" ? "step" : undefined} className="relative flex flex-col items-center gap-1.5 px-1">
              {i > 0 ? (
                <span aria-hidden="true" className={["absolute end-1/2 top-[15px] h-0.5 w-full", i <= track ? "bg-lagoon-600" : "bg-sand-300"].join(" ")} />
              ) : null}
              <span
                aria-hidden="true"
                className={[
                  "relative z-[1] inline-flex size-8 items-center justify-center rounded-full text-sm font-bold",
                  state === "done" ? "bg-lagoon-600 text-white" : state === "current" ? "bg-white text-sea-800 ring-2 ring-sea-700" : "bg-sand-100 text-ink-500 ring-1 ring-sand-300",
                ].join(" ")}
              >
                {state === "done" ? <CheckIcon className="size-4" /> : n(i + 1)}
              </span>
              <span className={state === "current" || (node === "live" && state === "done") ? "font-semibold text-sea-900" : "text-ink-700"}>
                {t(`track.${node}`)}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 border-t border-sand-200 pt-5">{action}</div>
    </section>
  );
}

/** A compact "Step 4" link-style button at the row end: 40 px tall (rule W2), so the item label keeps the row width. */
const goClass =
  "inline-flex min-h-10 shrink-0 items-center gap-1 rounded-[var(--radius-field)] px-2 text-sm font-semibold text-sea-700 hover:bg-sand-100";

/** Index of the current review node: 0 Submit, 1 Under review; 3 when live, so every node shows done. */
function trackFor(stage: Stage): number {
  if (stage === "submitted") return 1;
  if (stage === "live" || stage === "editing") return 3;
  return 0;
}

/** Done: lagoon check (never mirrored, rule R2). To do: an empty ring. */
function Mark({ done }: { done: boolean }) {
  return done ? (
    <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
      <CheckIcon className="size-3.5" />
    </span>
  ) : (
    <span aria-hidden="true" className="inline-flex size-6 shrink-0 rounded-full ring-2 ring-inset ring-gold-500" />
  );
}
