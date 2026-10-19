// Static intake chat for the prototype (screen 8, task 3.12 builds the live one). Full-height sheet on phone, end-side panel
// on desktop. Scope, emergency line and Talk to a human pinned at the top (rules I1, H14, Q6); quick replies under the question.
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge, Button, Chip, Input } from "@/components/ui";

const QUICK_REPLIES = ["skin", "heart", "child", "women", "pain", "mind", "other"] as const;

export function IntakeChatSheet({ emergencyNumber, closeHref }: { emergencyNumber: string; closeHref: string }) {
  const t = useTranslations("intake");
  const tc = useTranslations("common");
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <Link href={closeHref} aria-label={tc("close")} className="hidden flex-1 bg-sea-900/40 md:block" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-title"
        className="flex h-full w-full flex-col bg-sand-50 shadow-[var(--shadow-card)] md:max-w-md"
      >
        <header className="flex items-center justify-between gap-3 border-b border-sand-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 id="intake-title" className="text-lg font-bold text-sea-900">
              {t("title")}
            </h2>
            <Badge tone="info">{t("aiLabel")}</Badge>
          </div>
          <Link href={closeHref} className="inline-flex min-h-11 items-center rounded-[var(--radius-field)] px-3 font-semibold text-sea-700 hover:bg-sand-100">
            {tc("close")}
          </Link>
        </header>

        <div className="border-b border-sand-200 bg-white px-4 py-3 text-sm">
          <p className="text-ink-900">{t("scope")}</p>
          <p className="mt-1.5 text-ink-700">{tc("notForEmergenciesWithNumber", { number: emergencyNumber })}</p>
          <Button variant="secondary" className="mt-3 w-full">
            {tc("talkToHuman")}
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          <p className="text-xs text-ink-500">{t("consent")}</p>
          <div className="max-w-[85%] rounded-[var(--radius-card)] rounded-ss-md bg-white px-4 py-3 text-ink-900 shadow-[var(--shadow-nav)]">
            {t("question1")}
          </div>
          <ul className="flex flex-wrap gap-2" aria-label={t("quickReplies")}>
            {QUICK_REPLIES.map((key) => (
              <li key={key}>
                <button type="button" className="rounded-[var(--radius-tag)]">
                  <Chip>{t(`reply.${key}`)}</Chip>
                </button>
              </li>
            ))}
          </ul>
          <p className="rounded-[var(--radius-field)] border border-dashed border-sand-300 px-3 py-2 text-xs text-ink-500">{t("prototypeNote")}</p>
        </div>

        <form className="flex gap-2 border-t border-sand-200 bg-white px-4 py-3" onSubmit={undefined}>
          <Input aria-label={t("freeText")} placeholder={t("freeText")} />
          <Button type="button">{t("send")}</Button>
        </form>
      </aside>
    </div>
  );
}
