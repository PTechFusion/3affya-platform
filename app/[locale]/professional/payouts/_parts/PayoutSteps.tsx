// The three-step status list (identity, bank, payouts on): every step shown, the current one highlighted (rule F3). Under a
// step with items outstanding, what Stripe still needs for it, one plain line each (rule L3); under the current step with
// nothing listed yet, what it asks for. Marks match the claim checklist: done is a lagoon check (never mirrored, rule R2), the
// current step a sea ring, a step Stripe wants more for a danger ring, the rest an empty sand ring. The page shows the count of
// steps left beside its heading (rule B3).
import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/ui";
import type { PayoutNeed, PayoutStep, PayoutStepStatus } from "@/lib/payouts";

export function PayoutSteps({ steps, needs }: { steps: PayoutStep[]; needs: PayoutNeed[] }) {
  const t = useTranslations("payouts");
  return (
    <section aria-labelledby="payout-steps-title">
      <h2 id="payout-steps-title" className="sr-only">
        {t("steps.title")}
      </h2>
      <ol className="divide-y divide-sand-200 border-y border-sand-200">
        {steps.map((step) => {
          const items = needs.filter((n) => n.step === step.key);
          const highlight = step.status === "current" || step.status === "needed";
          const muted = step.status === "todo" || step.status === "paused";
          return (
            // Mark, name and status on the first line; the items or the detail under the name and status, so they get the
            // full width on a phone.
            <li
              key={step.key}
              aria-current={step.status === "current" ? "step" : undefined}
              className={[
                "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5",
                highlight ? "-mx-2 rounded-[var(--radius-field)] bg-sea-100/60 px-2" : "",
              ].join(" ")}
            >
              <Mark status={step.status} />
              <span className={["font-semibold", step.status === "paused" ? "text-ink-500" : "text-ink-900"].join(" ")}>{t(`steps.${step.key}`)}</span>
              <span className={["pt-0.5 text-sm", statusTone[step.status]].join(" ")}>{t(`steps.status.${step.status}`)}</span>
              {items.length ? (
                <ul className={["col-span-2 col-start-2 list-disc ps-5 text-sm", muted ? "text-ink-500" : "text-ink-900"].join(" ")}>
                  {items.map((n) => (
                    <li key={n.key}>{t(`needs.${n.key}`)}</li>
                  ))}
                </ul>
              ) : step.status === "current" ? (
                <p className="col-span-2 col-start-2 text-sm text-ink-700">{t(`steps.${step.key}Detail`)}</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const statusTone: Record<PayoutStepStatus, string> = {
  done: "text-ink-500",
  current: "font-semibold text-sea-700",
  todo: "text-ink-500",
  needed: "font-semibold text-danger",
  paused: "font-semibold text-ink-500",
};

function Mark({ status }: { status: PayoutStepStatus }) {
  if (status === "done") {
    return (
      <span aria-hidden="true" className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
        <CheckIcon className="size-3.5" />
      </span>
    );
  }
  const ring = status === "current" ? "ring-2 ring-sea-700" : status === "needed" ? "ring-2 ring-danger" : "ring-1 ring-sand-400";
  return <span aria-hidden="true" className={["mt-0.5 inline-flex size-6 shrink-0 rounded-full bg-white ring-inset", ring].join(" ")} />;
}
