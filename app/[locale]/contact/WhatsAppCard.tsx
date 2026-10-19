// WhatsApp click-to-chat, the first of the two contact choices (rule G3). The hook: WhatsApp opens with the greeting already
// typed, and the card shows that greeting so the patient knows what will be sent. Shared by the page and its loading state.
import { useTranslations } from "next-intl";
import { LinkButton, Surface } from "@/components/ui";
import { business } from "@/config/business";

const supportDigits = () => business.supportWhatsApp.replace(/\D/g, "");

/** wa.me link with the greeting pre-filled. With no number configured (prototype) wa.me lets the person pick the chat. */
export function whatsAppHref(text: string): string {
  return `https://wa.me/${supportDigits()}?text=${encodeURIComponent(text)}`;
}

export function WhatsAppCard({ className }: { className?: string }) {
  const t = useTranslations("contact.whatsapp");
  const greeting = t("greeting");
  const digits = supportDigits();
  return (
    <Surface className={className}>
      <section aria-labelledby="whatsapp-title">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-900">
            <ChatIcon />
          </span>
          <div>
            <h2 id="whatsapp-title" className="text-xl font-bold text-sea-900">
              {t("title")}
            </h2>
            <p className="text-sm text-ink-700">{t("speed")}</p>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-ink-700">{t("previewLabel")}</p>
        <p dir="auto" className="mt-1.5 max-w-sm rounded-[var(--radius-card)] rounded-se-md bg-lagoon-100 px-4 py-2.5 text-ink-900">
          {greeting}
        </p>
        <LinkButton
          href={whatsAppHref(greeting)}
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
          className="mt-4 w-full sm:w-auto"
          aria-describedby="whatsapp-privacy"
        >
          {t("button")}
        </LinkButton>
        {digits ? (
          <p className="mt-2 text-sm text-ink-700">
            {t("number")} <span className="ltr-run font-semibold">+{digits}</span>
          </p>
        ) : null}
        <p id="whatsapp-privacy" className="mt-3 text-sm text-ink-700">
          {t("privacy")}
        </p>
      </section>
    </Surface>
  );
}

/** Speech bubble: a generic chat mark, not the WhatsApp logo; never mirrored. */
function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
      <path
        d="M12 3.5c-4.7 0-8.5 3.4-8.5 7.6 0 2.2 1 4.1 2.7 5.5L5.5 20.5l4.1-1.9c.8.2 1.6.3 2.4.3 4.7 0 8.5-3.4 8.5-7.6S16.7 3.5 12 3.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.5 11h7M8.5 14h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
