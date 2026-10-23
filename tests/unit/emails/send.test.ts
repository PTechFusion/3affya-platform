// lib/email-templates/send.ts against a stubbed fetch: no network, no key needed. What goes to Resend (sender, reply address,
// both parts, the .ics, the idempotency key, the timeout) and how each answer maps to { ok, error }.
import { describe, expect, it, vi } from "vitest";
import { business, emailSettings } from "@/config/business";
import { getTemplate } from "@/lib/email-templates";
import { sampleEmailData } from "@/lib/email-templates/samples";
import { isRetryable, RESEND_EMAILS_URL, sendEmail } from "@/lib/email-templates/send";

const NOW = new Date("2026-11-09T09:00:00Z");
const env = { RESEND_API_KEY: "test-key-not-real" };
const otp = sampleEmailData("otp", "ar", "signIn", NOW);

const answer = (status: number, body: unknown) =>
  vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("sendEmail", () => {
  it("sends nothing without RESEND_API_KEY", async () => {
    const fetch = answer(200, { id: "x" });
    expect(await sendEmail("otp", "ar", "noura@example.com", otp, { idempotencyKey: "otp:1", fetch, env: {} })).toEqual({
      ok: false,
      error: "notConfigured",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a bad address and a missing or oversized idempotency key before calling Resend", async () => {
    const fetch = answer(200, { id: "x" });
    expect(await sendEmail("otp", "ar", "noura@", otp, { idempotencyKey: "otp:1", fetch, env })).toEqual({ ok: false, error: "invalidAddress" });
    expect(await sendEmail("otp", "ar", "noura@example.com", otp, { idempotencyKey: " ", fetch, env })).toEqual({ ok: false, error: "invalidKey" });
    const long = "k".repeat(emailSettings.idempotencyKeyMaxChars + 1);
    expect(await sendEmail("otp", "ar", "noura@example.com", otp, { idempotencyKey: long, fetch, env })).toEqual({ ok: false, error: "invalidKey" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts the rendered email with the key as Idempotency-Key and a 10 s timeout", async () => {
    const fetch = answer(200, { id: "email_123" });
    // Review fix: the test only checked that some signal was passed; it now checks the signal is the 10 s Resend budget.
    const timeout = vi.spyOn(AbortSignal, "timeout");
    let result: Awaited<ReturnType<typeof sendEmail>>;
    let signal: unknown;
    try {
      result = await sendEmail("otp", "ar", " noura@example.com ", otp, { idempotencyKey: "otp:abc", fetch, env });
      expect(emailSettings.sendTimeoutMs).toBe(10_000);
      expect(timeout).toHaveBeenCalledExactlyOnceWith(emailSettings.sendTimeoutMs);
      signal = timeout.mock.results[0]?.value;
    } finally {
      timeout.mockRestore();
    }
    expect(result).toEqual({ ok: true, id: "email_123" });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe(RESEND_EMAILS_URL);
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("otp:abc");
    expect(headers.Authorization).toBe("Bearer test-key-not-real");
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(init?.signal).toBe(signal);
    const body = JSON.parse(String(init?.body));
    const t = getTemplate("otp");
    expect(body.from).toBe(`${emailSettings.fromName} <${emailSettings.fromAddress}>`);
    expect(body.reply_to).toBe(business.supportEmail);
    expect(body.to).toEqual(["noura@example.com"]);
    expect(body.subject).toBe(t.subject("ar", otp));
    expect(body.html).toBe(t.render("ar", otp).html);
    expect(body.text).toBe(t.render("ar", otp).text);
    expect(body.attachments).toEqual([]);
  });

  it("takes the sender and reply address from env when set", async () => {
    const fetch = answer(200, { id: "e" });
    await sendEmail("otp", "en", "noura@example.com", otp, {
      idempotencyKey: "otp:env",
      fetch,
      env: { ...env, EMAIL_FROM: "3affya <test@mail.3affya.com>", EMAIL_REPLY_TO: "support@3affya.com" },
    });
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body.from).toBe("3affya <test@mail.3affya.com>");
    expect(body.reply_to).toBe("support@3affya.com");
  });

  it("attaches the booking's .ics, base64 of the UTF-8 calendar file", async () => {
    const fetch = answer(200, { id: "e" });
    const booking = sampleEmailData("bookingConfirmed", "ar", "patient", NOW);
    await sendEmail("bookingConfirmed", "ar", "noura@example.com", booking, { idempotencyKey: "bookingConfirmed:bk_004:patient", fetch, env });
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].filename).toBe("3affya-visit.ics");
    const ics = new TextDecoder().decode(Uint8Array.from(atob(body.attachments[0].content), (c) => c.charCodeAt(0)));
    expect(ics).toBe(getTemplate("bookingConfirmed").attachments("ar", booking)[0]?.content);
  });

  it("maps Resend's answers to errors, and says which are worth a retry", async () => {
    const send = (fetch: typeof globalThis.fetch) => sendEmail("otp", "en", "noura@example.com", otp, { idempotencyKey: "otp:x", fetch, env });
    expect(await send(answer(429, { name: "rate_limit_exceeded" }))).toEqual({ ok: false, error: "rateLimited" });
    expect(await send(answer(409, { name: "invalid_idempotent_request" }))).toEqual({ ok: false, error: "conflict" });
    expect(await send(answer(409, { name: "concurrent_idempotent_requests" }))).toEqual({ ok: false, error: "unavailable" });
    expect(await send(answer(422, { name: "validation_error" }))).toEqual({ ok: false, error: "rejected" });
    expect(await send(answer(403, { name: "invalid_from_address" }))).toEqual({ ok: false, error: "rejected" });
    expect(await send(answer(500, { name: "internal_server_error" }))).toEqual({ ok: false, error: "unavailable" });
    expect(await send(answer(200, {}))).toEqual({ ok: false, error: "unavailable" });
    expect(isRetryable("timeout") && isRetryable("rateLimited") && isRetryable("unavailable")).toBe(true);
    expect(isRetryable("conflict") || isRetryable("rejected") || isRetryable("render")).toBe(false);
  });

  it("reports a timeout and a network failure without throwing", async () => {
    const timeout = vi.fn<typeof fetch>(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    });
    const offline = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    const send = (fetch: typeof globalThis.fetch) => sendEmail("otp", "en", "noura@example.com", otp, { idempotencyKey: "otp:y", fetch, env });
    expect(await send(timeout)).toEqual({ ok: false, error: "timeout" });
    expect(await send(offline)).toEqual({ ok: false, error: "unavailable" });
  });

  it("reports a template that cannot render instead of throwing", async () => {
    const fetch = answer(200, { id: "e" });
    const broken = { ...otp, requestedAt: new Date(Number.NaN) };
    expect(await sendEmail("otp", "en", "noura@example.com", broken, { idempotencyKey: "otp:z", fetch, env })).toEqual({ ok: false, error: "render" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
