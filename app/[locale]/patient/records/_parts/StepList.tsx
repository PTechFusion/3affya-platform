// The nine fixed steps of the records pipeline (ADR-4) as a vertical list, the current one live (rule T11: show the work, no
// fake percentage). Each marker carries its state in text for screen readers, not only in colour. The connector runs down the
// start edge, so the list reads the same way in both directions.
import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/ui";
import { PIPELINE_STEPS, type PipelineStep, type StepState } from "@/lib/records";
import { AlertIcon } from "./icons";

function Marker({ state }: { state: StepState }) {
  const base = "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full";
  switch (state) {
    case "done":
      return (
        <span className={`${base} bg-sea-700 text-white`}>
          <CheckIcon className="size-3.5" />
        </span>
      );
    case "current":
      return (
        <span className={`${base} bg-white ring-2 ring-lagoon-500`}>
          <span className="size-2.5 rounded-full bg-lagoon-500 motion-safe:animate-pulse" />
        </span>
      );
    case "failed":
      return (
        <span className={`${base} bg-danger text-white`}>
          <AlertIcon className="size-3.5" />
        </span>
      );
    case "stopped":
      return (
        <span className={`${base} bg-sand-300`}>
          <span className="h-0.5 w-2.5 rounded-full bg-ink-700" />
        </span>
      );
    default:
      return <span className={`${base} border-2 border-sand-300 bg-white`} />;
  }
}

export function StepList({ states, details }: { states: Record<PipelineStep, StepState>; details: Partial<Record<PipelineStep, string>> }) {
  const t = useTranslations("recordSet.steps");
  return (
    <ol aria-label={t("label")} className="flex flex-col">
      {PIPELINE_STEPS.map((step, i) => {
        const state = states[step];
        const detail = details[step];
        const last = i === PIPELINE_STEPS.length - 1;
        return (
          <li key={step} aria-current={state === "current" ? "step" : undefined} className="relative flex gap-3 pb-1.5 last:pb-0">
            {last ? null : (
              <span
                aria-hidden="true"
                className={`absolute start-[11px] top-6 bottom-0 w-0.5 ${state === "done" ? "bg-sea-700" : "bg-sand-300"}`}
              />
            )}
            <Marker state={state} />
            <div className="min-w-0 flex-1">
              <p
                className={
                  state === "current" || state === "failed"
                    ? "font-bold leading-6 text-ink-900"
                    : state === "done"
                      ? "leading-6 text-ink-900"
                      : "leading-6 text-ink-500"
                }
              >
                {t(`${step}.title`)}
                <span className="sr-only">{t("state", { state })}</span>
              </p>
              {detail ? (
                <p className={state === "failed" ? "text-sm font-semibold text-danger" : state === "current" ? "text-sm font-semibold text-lagoon-900" : "text-sm text-ink-700"}>
                  {detail}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
