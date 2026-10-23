// The one email layout (screen 49's layout call): wordmark, a one-line headline, the key block (a code, an appointment card or
// receipt lines), one button, plain-text details, and a footer with the postal address and the support email. A 600 px single
// column of tables, the shape Gmail and Outlook both render. Every template builds an EmailContent and hands it here, so the
// eight emails share one structure, one set of tokens (theme.ts) and one place for the RTL rules:
//   - dir and align on every table and cell, not only on <html> (rule E4: Outlook and Gmail drop the document direction);
//   - Arabic never under 16 px (E4, R5), 17 px body as on the site;
//   - codes, numbers and addresses in left-to-right isolates (rich.ts `ltr`, rule R3); digits are Western (lib/format, N1).
// Built as strings rather than TSX: Next 16 refuses react-dom/server in route handlers and server components, which is where
// emails are rendered (Inngest functions, webhook handlers, this preview), so a string layout is the one that runs everywhere.
import { business } from "@/config/business";
import type { Locale } from "@/lib/format";
import { translator } from "./messages";
import { esc, link, ltr, plain, rich, type Rich } from "./rich";
import { dirFor, emailColors as c, emailFont, emailRadius, emailType, endFor, startFor, white } from "./theme";

export type FactRow = { label: string; value: Rich };
export type MoneyLine = { label: string; detail?: string; amount: string };

export type Block =
  /** A paragraph. */
  | { kind: "p"; text: Rich; muted?: boolean }
  /** A short heading inside the body, e.g. "Before your visit". */
  | { kind: "heading"; text: string }
  /** Someone's own words (the admin's personal line, a reviewer's note), shown as written: dir="auto", their language. */
  | { kind: "quote"; caption: string; body: string; lang?: Locale }
  /** The key block for a one-time code. */
  | { kind: "code"; label: string; code: string; caption?: Rich }
  /** The key block as labelled rows: an appointment card, registry facts, what was received. */
  | { kind: "facts"; title?: string; rows: FactRow[] }
  /** Receipt lines (rule E3): the total first and largest, the rows under it, then the three lines and the total again. */
  | { kind: "money"; title: string; total: { label: string; amount: string }; rows?: FactRow[]; lines: MoneyLine[]; caption?: string }
  /** Anything written by AI or pointing at AI output (rule T4): the label comes first, then the review status. */
  | { kind: "ai"; label: string; status: string; title: string; body: Rich }
  /** The one button. */
  | { kind: "button"; label: string; href: string }
  /** A short list with a title, e.g. what to prepare. */
  | { kind: "list"; title: string; items: Array<{ title: string; body?: Rich }> };

export type EmailContent = {
  locale: Locale;
  subject: string;
  /** The inbox preview line (rule E1): real information, never "view in browser". */
  preheader: string;
  headline: string;
  blocks: Block[];
  /** Why the reader got this email, and any line only this email needs. The layout adds the address and the support line. */
  footer: Rich[];
};

export type RenderOptions = {
  /** Where the wordmark is loaded from. Default: NEXT_PUBLIC_SITE_URL, else https://3affya.com. "" keeps it relative (preview). */
  assetsBaseUrl?: string;
};

export type RenderedEmail = { html: string; text: string };

export const WORDMARK_PATH = "/brand/3affya_wordmark_transparent.png";

export function defaultAssetsBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://3affya.com").replace(/\/+$/, "");
}

/** Throws on a layout the rules forbid, so a template cannot ship one: more than one button, an AI block with no label. */
function assertShape(content: EmailContent) {
  const buttons = content.blocks.filter((b) => b.kind === "button").length;
  if (buttons > 1) throw new Error(`Email "${content.subject}" has ${buttons} buttons; the layout allows one.`);
  for (const b of content.blocks) {
    if (b.kind === "ai" && !b.label.trim()) throw new Error("An AI block needs its label (rule T4).");
  }
}

export function renderEmail(content: EmailContent, options: RenderOptions = {}): RenderedEmail {
  assertShape(content);
  return { html: renderHtml(content, options), text: renderText(content) };
}

/* ---------------- Shared footer ---------------- */

function sharedFooter(locale: Locale): Rich[] {
  const tf = translator(locale, "footer");
  const tl = translator(locale, "email.layout");
  const email = business.supportEmail;
  return [
    plain(`${tf("entity")} ${tf("address")}`),
    rich(tl, "support", {}, { email: link(ltr(email), `mailto:${email}`, c["sea-700"]) }),
  ];
}

/* ---------------- HTML ---------------- */

function renderHtml(content: EmailContent, options: RenderOptions): string {
  const { locale } = content;
  const dir = dirFor(locale);
  const start = startFor(locale);
  const end = endFor(locale);
  const size = emailType(locale);
  const tl = translator(locale, "email.layout");
  const base = options.assetsBaseUrl ?? defaultAssetsBaseUrl();

  const font = (px: string, color: string = c["ink-900"], weight = 400) =>
    `font-family:${emailFont};font-size:${px};line-height:${size.lineHeight};color:${color};font-weight:${weight};`;
  const cellDir = `dir="${dir}" align="${start}"`;
  const cellStyle = `direction:${dir};text-align:${start};`;
  /** A full-width row of the card, with the side padding that narrows on phones (.px). */
  const row = (inner: string, bottom = 20) =>
    `<tr><td class="px" ${cellDir} style="${cellStyle}padding:0 32px ${bottom}px 32px;">${inner}</td></tr>`;
  const para = (r: Rich, px: string = size.body, color: string = c["ink-900"]) =>
    `<p dir="${dir}" style="margin:0;${cellStyle}${font(px, color)}">${r.html}</p>`;
  /** A tinted box (the key block). */
  const box = (inner: string, bg: string = c["sand-100"], border = "") =>
    `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${bg};${border}border-radius:${emailRadius.field};">` +
    `<tr><td ${cellDir} style="${cellStyle}padding:18px 20px;">${inner}</td></tr></table>`;
  const factRows = (rows: FactRow[]) =>
    `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">` +
    rows
      .map(
        (r) =>
          `<tr><td ${cellDir} valign="top" style="${cellStyle}padding:4px 0;padding-${end}:16px;width:38%;${font(size.small, c["ink-700"])}">${esc(r.label)}</td>` +
          `<td ${cellDir} valign="top" style="${cellStyle}padding:4px 0;${font(size.body, c["ink-900"], 600)}">${r.value.html}</td></tr>`,
      )
      .join("") +
    `</table>`;

  const blockHtml = (b: Block): string => {
    switch (b.kind) {
      case "p":
        return row(para(b.text, size.body, b.muted ? c["ink-700"] : c["ink-900"]));
      case "heading":
        return row(`<h2 dir="${dir}" style="margin:0;${cellStyle}${font(size.lead, c["sea-900"], 700)}">${esc(b.text)}</h2>`, 8);
      case "quote": {
        const lang = b.lang ? ` lang="${b.lang}"` : "";
        const body = esc(b.body).replace(/\r?\n/g, "<br>");
        return row(
          `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${c["sand-50"]};border-radius:${emailRadius.field};border-${start}:4px solid ${c["lagoon-600"]};">` +
            `<tr><td ${cellDir} style="${cellStyle}padding:14px 18px;">` +
            `<p dir="${dir}" style="margin:0 0 4px 0;${cellStyle}${font(size.small, c["ink-700"], 600)}">${esc(b.caption)}</p>` +
            `<p dir="auto"${lang} style="margin:0;${font(size.body)}">${body}</p>` +
            `</td></tr></table>`,
        );
      }
      case "code":
        return row(
          box(
            `<p dir="${dir}" style="margin:0 0 6px 0;${cellStyle}${font(size.small, c["ink-700"], 600)}">${esc(b.label)}</p>` +
              `<p dir="${dir}" style="margin:0;${cellStyle}${font(size.display, c["sea-900"], 700)}letter-spacing:6px;">${ltr(b.code).html}</p>` +
              (b.caption ? `<p dir="${dir}" style="margin:8px 0 0 0;${cellStyle}${font(size.small, c["ink-700"])}">${b.caption.html}</p>` : ""),
          ),
        );
      case "facts":
        return row(
          box(
            (b.title ? `<p dir="${dir}" style="margin:0 0 8px 0;${cellStyle}${font(size.small, c["ink-700"], 600)}">${esc(b.title)}</p>` : "") +
              factRows(b.rows),
          ),
        );
      case "money": {
        const lines = b.lines
          .map(
            (l) =>
              `<tr><td ${cellDir} valign="top" style="${cellStyle}padding:10px 0;padding-${end}:16px;border-bottom:1px solid ${c["sand-200"]};${font(size.body)}">${esc(l.label)}` +
              (l.detail ? `<br><span style="${font(size.small, c["ink-500"])}">${esc(l.detail)}</span>` : "") +
              `</td><td dir="${dir}" align="${end}" valign="top" style="direction:${dir};text-align:${end};white-space:nowrap;padding:10px 0;border-bottom:1px solid ${c["sand-200"]};${font(size.body)}">${esc(l.amount)}</td></tr>`,
          )
          .join("");
        const total =
          `<tr><td ${cellDir} style="${cellStyle}padding:10px 0 0 0;padding-${end}:16px;${font(size.body, c["sea-900"], 700)}">${esc(b.total.label)}</td>` +
          `<td dir="${dir}" align="${end}" style="direction:${dir};text-align:${end};white-space:nowrap;padding:10px 0 0 0;${font(size.body, c["sea-900"], 700)}">${esc(b.total.amount)}</td></tr>`;
        return row(
          box(
            `<p dir="${dir}" style="margin:0;${cellStyle}${font(size.small, c["ink-700"], 600)}">${esc(b.title)}</p>` +
              `<p dir="${dir}" style="margin:0 0 10px 0;${cellStyle}${font(size.display, c["sea-900"], 700)}">${esc(b.total.amount)}</p>` +
              (b.rows?.length ? factRows(b.rows) : "") +
              (b.caption ? `<p dir="${dir}" style="margin:14px 0 0 0;${cellStyle}${font(size.small, c["ink-700"], 600)}">${esc(b.caption)}</p>` : "") +
              `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:4px;">${lines}${total}</table>`,
            white,
            `border:1px solid ${c["sand-200"]};`,
          ),
        );
      }
      case "ai":
        return row(
          box(
            `<p dir="${dir}" style="margin:0 0 6px 0;${cellStyle}">` +
              `<span style="display:inline-block;padding:2px 10px;border-radius:${emailRadius.tag};background-color:${white};border:1px solid ${c["lagoon-600"]};${font(size.small, c["lagoon-900"], 700)}">${esc(b.label)}</span>` +
              `<span style="${font(size.small, c["ink-700"])}">&nbsp;&nbsp;${esc(b.status)}</span></p>` +
              `<p dir="${dir}" style="margin:0 0 4px 0;${cellStyle}${font(size.body, c["sea-900"], 700)}">${esc(b.title)}</p>` +
              para(b.body, size.small, c["ink-700"]),
            c["lagoon-100"],
          ),
        );
      case "button":
        return row(
          `<table role="presentation" dir="${dir}" align="${start}" cellpadding="0" cellspacing="0" border="0">` +
            `<tr><td dir="${dir}" align="center" bgcolor="${c["sea-700"]}" style="border-radius:${emailRadius.field};background-color:${c["sea-700"]};mso-padding-alt:14px 24px;">` +
            `<a href="${esc(b.href)}" target="_blank" style="display:inline-block;padding:14px 24px;border-radius:${emailRadius.field};text-decoration:none;${font(size.body, white, 700)}">${esc(b.label)}</a>` +
            `</td></tr></table>`,
          24,
        );
      case "list":
        return row(
          `<h2 dir="${dir}" style="margin:0 0 8px 0;${cellStyle}${font(size.lead, c["sea-900"], 700)}">${esc(b.title)}</h2>` +
            `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">` +
            b.items
              .map(
                (item) =>
                  `<tr><td dir="${dir}" valign="top" width="20" style="width:20px;padding:4px 0;${font(size.body, c["lagoon-600"], 700)}">&#8226;</td>` +
                  `<td ${cellDir} valign="top" style="${cellStyle}padding:4px 0;${font(size.body)}"><strong style="font-weight:700">${esc(item.title)}</strong>` +
                  (item.body ? `<br><span style="${font(size.small, c["ink-700"])}">${item.body.html}</span>` : "") +
                  `</td></tr>`,
              )
              .join("") +
            `</table>`,
        );
    }
  };

  const footer = [...content.footer, ...sharedFooter(locale)]
    .map((line) => `<tr><td class="px" ${cellDir} style="${cellStyle}padding:0 32px 10px 32px;${font(size.small, c["ink-500"])}">${line.html}</td></tr>`)
    .join("");

  // Fillers after the preheader stop clients pulling body text into the inbox preview line.
  const filler = "&#847;&zwnj;&nbsp;".repeat(60);

  return [
    `<!DOCTYPE html>`,
    `<html lang="${locale}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<meta name="x-apple-disable-message-reformatting">`,
    `<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">`,
    `<meta name="color-scheme" content="light">`,
    `<meta name="supported-color-schemes" content="light">`,
    `<title>${esc(content.subject)}</title>`,
    `<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->`,
    `<style>`,
    `body{margin:0;padding:0;width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}`,
    `table{border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;}`,
    `img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}`,
    `a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;}`,
    `@media (max-width:620px){.px{padding-left:20px!important;padding-right:20px!important;}.outer{padding:12px 8px!important;}}`,
    `</style>`,
    `</head>`,
    `<body dir="${dir}" style="margin:0;padding:0;background-color:${c["sand-50"]};">`,
    `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;color:${c["sand-50"]};">${esc(content.preheader)}${filler}</div>`,
    `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${c["sand-50"]};">`,
    `<tr><td class="outer" dir="${dir}" align="center" style="padding:24px 12px;">`,
    `<!--[if mso]><table role="presentation" dir="${dir}" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td dir="${dir}"><![endif]-->`,
    `<table role="presentation" dir="${dir}" lang="${locale}" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${white};border:1px solid ${c["sand-200"]};border-radius:${emailRadius.card};">`,
    `<tr><td class="px" ${cellDir} style="${cellStyle}padding:28px 32px 20px 32px;">`,
    `<img src="${esc(base + WORDMARK_PATH)}" width="108" height="36" alt="${esc(tl("wordmarkAlt"))}" style="display:block;border:0;width:108px;height:36px;">`,
    `</td></tr>`,
    row(`<h1 dir="${dir}" style="margin:0;${cellStyle}font-family:${emailFont};font-size:${size.headline};line-height:1.35;color:${c["sea-900"]};font-weight:700;">${esc(content.headline)}</h1>`, 16),
    ...content.blocks.map(blockHtml),
    `<tr><td dir="${dir}" style="padding:0 0 12px 0;"></td></tr>`,
    `</table>`,
    `<table role="presentation" dir="${dir}" lang="${locale}" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">`,
    `<tr><td dir="${dir}" style="padding:16px 0 0 0;"></td></tr>`,
    footer,
    `</table>`,
    `<!--[if mso]></td></tr></table><![endif]-->`,
    `</td></tr>`,
    `</table>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

/* ---------------- Plain text ---------------- */

function renderText(content: EmailContent): string {
  const blockText = (b: Block): string => {
    switch (b.kind) {
      case "p":
        return b.text.text;
      case "heading":
        return b.text;
      case "quote":
        return `${b.caption}\n${b.body}`;
      case "code":
        return [b.label, b.code, b.caption?.text].filter(Boolean).join("\n");
      case "facts":
        return [b.title, ...b.rows.map((r) => `${r.label}: ${r.value.text}`)].filter(Boolean).join("\n");
      case "money":
        return [
          `${b.title}: ${b.total.amount}`,
          ...(b.rows ?? []).map((r) => `${r.label}: ${r.value.text}`),
          b.caption,
          ...b.lines.map((l) => `${l.label}: ${l.amount}`),
          `${b.total.label}: ${b.total.amount}`,
        ]
          .filter(Boolean)
          .join("\n");
      case "ai":
        return `[${b.label} · ${b.status}] ${b.title}\n${b.body.text}`;
      case "button":
        return `${b.label}:\n${b.href}`;
      case "list":
        return [b.title, ...b.items.map((i) => `- ${i.title}${i.body ? `: ${i.body.text}` : ""}`)].join("\n");
    }
  };
  const footer = [...content.footer, ...sharedFooter(content.locale)].map((r) => r.text);
  return [content.headline, ...content.blocks.map(blockText), "--", footer.join("\n")].join("\n\n") + "\n";
}
