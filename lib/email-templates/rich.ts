// One line of email copy in both forms the email carries: safe HTML for the HTML part and plain text for the text part.
// Templates never concatenate raw strings into HTML: every value goes through esc() or arrives as a Rich built here, so a
// doctor's name or a reviewer's note can never inject markup. Rule R3 / E4: codes, numbers, addresses and URLs sit in their
// own left-to-right run (`ltr`), so "1847-2216" never reads back as "2216-1847" inside Arabic.
import type { Locale } from "@/lib/format";

export type Rich = { readonly html: string; readonly text: string };

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapes text for HTML element content and double-quoted attribute values. */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

/** Plain text. */
export const plain = (s: string): Rich => ({ html: esc(s), text: s });

/**
 * A left-to-right isolate (rules R3, E4). Short codes (OTP, receipt number, NPI) never break; anything longer (a file name, an
 * email address, a URL) may break anywhere rather than widen the email past a phone screen.
 */
export const ltr = (s: string): Rich => {
  const wrap = s.length <= 16 && !/\s/.test(s) ? "white-space:nowrap" : "word-break:break-word;overflow-wrap:anywhere";
  return { html: `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;${wrap}">${esc(s)}</span>`, text: s };
};

/** A run that keeps its own direction and language, e.g. an English reviewer note inside an Arabic email. */
export const inLang = (s: string, lang: Locale): Rich => ({
  html: `<span lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}" style="unicode-bidi:isolate">${esc(s)}</span>`,
  text: s,
});

/** Text whose script is unknown (a name someone typed): it takes its own direction and cannot reorder the sentence around it. */
export const isolated = (s: string): Rich => ({
  html: `<span dir="auto" style="unicode-bidi:isolate">${esc(s)}</span>`,
  text: s,
});

export const bold = (r: Rich): Rich => ({ html: `<strong style="font-weight:700">${r.html}</strong>`, text: r.text });

/**
 * A text link. In the text part the URL follows the label, the way plain-text mail clients make it clickable, unless the label
 * already is the address (a written-out URL, or the email address of a mailto link).
 */
export const link = (label: Rich, href: string, color: string): Rich => ({
  html: `<a href="${esc(href)}" target="_blank" style="color:${color};text-decoration:underline;font-weight:600">${label.html}</a>`,
  text: href === label.text || href === `mailto:${label.text}` ? label.text : `${label.text} (${href})`,
});

/** A URL written out as its own link, in a left-to-right run. */
export const urlLink = (href: string, color: string): Rich => link(ltr(href), href, color);

export const joinRich = (parts: Rich[], sep: string): Rich => ({
  html: parts.map((p) => p.html).join(esc(sep)),
  text: parts.map((p) => p.text).join(sep),
});

// Private-use markers stand in for rich values while the message is formatted, so the message text is escaped once and the
// rich parts (already safe HTML) go in afterwards. They cannot occur in our copy or in data.
const OPEN = "";
const CLOSE = "";

export type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Formats one message with plain values (escaped with the rest of the text) and rich values (inserted as they are), e.g.
 * rich(t, "support", {}, { email: ltr("hello@3affya.com") }).
 */
export function rich(t: Translate, key: string, values: Record<string, string | number> = {}, parts: Record<string, Rich> = {}): Rich {
  const marked: Record<string, string | number> = { ...values };
  for (const name of Object.keys(parts)) marked[name] = `${OPEN}${name}${CLOSE}`;
  const formatted = t(key, marked);
  const fill = (s: string, pick: (r: Rich) => string) =>
    s.replace(new RegExp(`${OPEN}([A-Za-z0-9_]+)${CLOSE}`, "g"), (_, name: string) => {
      const part = parts[name];
      if (!part) throw new Error(`rich(): no value for {${name}} in ${key}`);
      return pick(part);
    });
  return { html: fill(esc(formatted), (r) => r.html), text: fill(formatted, (r) => r.text) };
}
