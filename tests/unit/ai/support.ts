// Shared pieces for lane L3's unit tests: an env that passes readAiConfig, a scripted vendor adapter that records what it was
// asked, synthetic page bytes and model answers. No network, no key, no database.
import { fileURLToPath } from "node:url";
import type { PageInput } from "@/lib/ai/client";
import type { VendorAdapter, VendorRequest, VendorResponse } from "@/lib/ai/vendors/types";

/** An absolute path inside the repository. */
export const repoPath = (relative: string) => fileURLToPath(new URL(`../../../${relative}`, import.meta.url));

export const MODEL = "claude-opus-5-5";
export const JOB = "11111111-1111-4111-8111-111111111111";
export const JOB_B = "22222222-2222-4222-8222-222222222222";

export const ENV = { AI_VENDOR: "anthropic", AI_MODEL: MODEL, ANTHROPIC_API_KEY: "test-key-not-real" };

/** A tiny synthetic single-page PDF (header bytes are what the client checks). */
export const PDF_BYTES = new TextEncoder().encode("%PDF-1.4\n% synthetic unit-test page, no patient data\n%%EOF\n");
export const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

export const pdfPage = (pageRef = "d1:p1"): PageInput => ({ kind: "pdfPage", bytes: PDF_BYTES, mime: "application/pdf", pageRef });

export const item = (fields: Record<string, unknown> = {}) => ({
  type: "result",
  label: "Haemoglobin",
  value: "13.1",
  unit: "g/dL",
  date: "2026-09-14",
  ref_low: 12,
  ref_high: 15.5,
  frequency: null,
  reaction: null,
  confidence: 0.98,
  ...fields,
});

export const pageAnswer = (fields: Record<string, unknown> = {}) =>
  JSON.stringify({ unreadable: false, unreadable_reason: null, language: "en", items: [item()], notes: null, ...fields });

export const response = (text: string, fields: Partial<VendorResponse> = {}): VendorResponse => ({
  text,
  inputTokens: 3_000,
  outputTokens: 1_500,
  stopReason: "end_turn",
  stopDetail: null,
  model: MODEL,
  requestId: "req_test",
  ...fields,
});

type Step = VendorResponse | Error | ((request: VendorRequest) => VendorResponse | Promise<VendorResponse>);

/** Answers each call with the next step (the last one repeats); records every request. */
export function scriptedAdapter(steps: Step[]): VendorAdapter & { requests: VendorRequest[] } {
  const requests: VendorRequest[] = [];
  return {
    name: "anthropic",
    requests,
    async call(request) {
      requests.push(request);
      const step = steps[Math.min(requests.length - 1, steps.length - 1)];
      if (step instanceof Error) throw step;
      if (typeof step === "function") return step(request);
      if (!step) throw new Error("no scripted step");
      return step;
    },
  };
}

/** A clock the test moves by hand. */
export function manualClock(start = Date.UTC(2026, 9, 21, 9, 0, 0)) {
  let t = start;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}
