// The one way to send a transactional email: render the template in the reader's language and post it to Resend's REST API with
// a 10 s timeout (emailSettings.sendTimeoutMs, the architecture's Resend budget) and the caller's idempotency key as Resend's
// Idempotency-Key header. Returns { ok, error }, never throws. Each flow's task wires its own call (task 2.3 invites, 2.5 and
// 2.8 claims and removals, 3.3 bookings, 3.4 refunds, L7 the auth hook for codes), from an Inngest step, never from a page.
//
// Idempotency: the key is stored with the row that triggered the email, so a retried step resends with the same key and Resend
// answers the first result instead of sending twice (Resend keeps keys for 24 hours). Shape: "<template>:<row id>[:<audience>]",
// e.g. "bookingConfirmed:9b2c…:patient". Templates are pure functions of their data, so the retry's payload is identical; a key
// reused with a different payload comes back as "conflict" and must not be retried.
//
// Nothing here logs: the recipient and the content are personal data (CLAUDE.md, Sentry scrubbing).
import { business, emailSettings } from "@/config/business";
import { checkEmail } from "@/lib/email";
import type { Locale } from "@/lib/format";
import { getTemplate, type TemplateData, type TemplateName } from "./index";

export type SendEmailError =
  /** RESEND_API_KEY is not set: nothing was sent. */
  | "notConfigured"
  /** The address fails lib/email's check. */
  | "invalidAddress"
  /** No idempotency key, or one longer than Resend accepts. */
  | "invalidKey"
  /** The template threw (a missing message, bad data). A bug: do not retry. */
  | "render"
  /** No answer within the timeout. Retry with the same key. */
  | "timeout"
  /** Resend's rate limit. Retry with the same key, later. */
  | "rateLimited"
  /** The key was used before with a different payload. Do not retry. */
  | "conflict"
  /** Resend refused the request (bad sender, unverified domain, invalid payload). Do not retry. */
  | "rejected"
  /** Network failure or a Resend server error. Retry with the same key. */
  | "unavailable";

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: SendEmailError };

export type SendEmailOptions = {
  idempotencyKey: string;
  /** For tests: the fetch to call. Default: the global fetch. */
  fetch?: typeof fetch;
  /** For tests and scripts: where RESEND_API_KEY, EMAIL_FROM and EMAIL_REPLY_TO are read. Default: process.env. */
  env?: EmailEnv;
};

export type EmailEnv = Record<string, string | undefined>;

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

/** Errors worth another attempt with the same idempotency key (an Inngest retry). */
export const isRetryable = (error: SendEmailError) => error === "timeout" || error === "rateLimited" || error === "unavailable";

/** The sender: EMAIL_FROM, else "3affya <hello@mail.3affya.com>" from config. */
export const senderFor = (env: EmailEnv = process.env) =>
  env.EMAIL_FROM?.trim() || `${emailSettings.fromName} <${emailSettings.fromAddress}>`;

/** Where replies go: EMAIL_REPLY_TO, else the support inbox. */
export const replyToFor = (env: EmailEnv = process.env) => env.EMAIL_REPLY_TO?.trim() || business.supportEmail;

/** UTF-8 text as base64, for attachments (works in Node and edge runtimes alike). */
function base64(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function sendEmail<N extends TemplateName>(
  template: N,
  locale: Locale,
  to: string,
  data: TemplateData<N>,
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const env = options.env ?? process.env;
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "notConfigured" };
  const address = to.trim();
  if (checkEmail(address)) return { ok: false, error: "invalidAddress" };
  const key = options.idempotencyKey?.trim() ?? "";
  if (!key || key.length > emailSettings.idempotencyKeyMaxChars) return { ok: false, error: "invalidKey" };

  let body: string;
  try {
    const t = getTemplate(template);
    const { html, text } = t.render(locale, data);
    body = JSON.stringify({
      from: senderFor(env),
      to: [address],
      reply_to: replyToFor(env),
      subject: t.subject(locale, data),
      html,
      text,
      attachments: t.attachments(locale, data).map((a) => ({ filename: a.filename, content: base64(a.content), content_type: a.contentType })),
      tags: [
        { name: "template", value: template },
        { name: "locale", value: locale },
      ],
    });
  } catch {
    return { ok: false, error: "render" };
  }

  let res: Response;
  try {
    res = await (options.fetch ?? fetch)(RESEND_EMAILS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key },
      body,
      signal: AbortSignal.timeout(emailSettings.sendTimeoutMs),
    });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    return { ok: false, error: name === "TimeoutError" || name === "AbortError" ? "timeout" : "unavailable" };
  }

  const answer = (await res.json().catch(() => null)) as { id?: unknown; name?: unknown } | null;
  if (res.ok) {
    // Sent (or already sent under this key). Without an id the outcome is unknown: retrying with the same key is safe.
    return typeof answer?.id === "string" ? { ok: true, id: answer.id } : { ok: false, error: "unavailable" };
  }
  if (res.status === 429) return { ok: false, error: "rateLimited" };
  if (res.status === 409) {
    // The same key still in flight elsewhere is worth a retry; the same key with a different payload is not.
    return { ok: false, error: answer?.name === "concurrent_idempotent_requests" ? "unavailable" : "conflict" };
  }
  if (res.status >= 500) return { ok: false, error: "unavailable" };
  return { ok: false, error: "rejected" };
}
