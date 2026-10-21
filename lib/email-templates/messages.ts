// Email copy comes from the same catalogues as the site (messages/*.json, keys under email.*; the claim invite keeps its keys
// under adminOutreach.email, where screen 46 reads them too). Emails are rendered outside a page request (Inngest jobs, route
// handlers, the test-send script, unit tests), so they use next-intl's plain createTranslator instead of getTranslations.
// A missing key throws: an email never goes out with "email.otp.subject" in it.
import { createTranslator, type AbstractIntlMessages } from "next-intl";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import type { Locale } from "@/lib/format";
import type { Translate } from "./rich";

// The catalogues hold a few arrays (read with t.raw on pages), which AbstractIntlMessages does not describe.
const catalogues = { ar, en } as unknown as Record<Locale, AbstractIntlMessages>;

export function translator(locale: Locale, namespace: string): Translate {
  const t = createTranslator({
    locale,
    messages: catalogues[locale],
    namespace,
    onError: (error) => {
      throw error;
    },
  });
  return (key, values) => (t as unknown as Translate)(key, values);
}
