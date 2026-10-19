// Trust strip under the hero (rules H7, H8, H13): licence, board certification with its one-sentence definition, price from X.
// layout="row" (default) is the full-width strip under a hero. layout="stack" is the same three items in one column with the
// label as a visible heading, for a sidebar (screen 2 holds it beside the article on desktop).
import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/ui";

export function TrustStrip({ fromPriceLabel, layout = "row" }: { fromPriceLabel?: string; layout?: "row" | "stack" }) {
  const t = useTranslations("trust");
  const stack = layout === "stack";
  const items: Array<{ title: string; body: string }> = [
    { title: t("licence"), body: t("licenceBody") },
    { title: t("board"), body: t("boardBody") },
    { title: fromPriceLabel ? t("price", { price: fromPriceLabel }) : t("priceUnknown"), body: t("priceBody") },
  ];
  return (
    <section
      aria-label={t("label")}
      className={stack ? "rounded-[var(--radius-card)] border border-sand-200 bg-white p-5" : "mx-auto max-w-6xl px-4 sm:px-6"}
    >
      {stack ? <h2 className="text-lg font-bold text-sea-900">{t("label")}</h2> : null}
      <ul
        className={
          stack
            ? "mt-4 grid gap-4"
            : "grid gap-3 rounded-[var(--radius-card)] border border-sand-200 bg-white p-4 sm:grid-cols-3 sm:gap-6 sm:p-6"
        }
      >
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
              <CheckIcon className="size-4" />
            </span>
            <div>
              <p className="font-semibold text-ink-900">{item.title}</p>
              <p className="text-sm text-ink-700">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
