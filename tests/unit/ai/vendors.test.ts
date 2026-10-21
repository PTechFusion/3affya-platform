// The two adapters with their SDKs mocked: AI_VENDOR picks the adapter, the model id comes from the environment, the request is
// a plain Messages call (no tools, no caching, no SDK retries, one deadline), usage and errors map to lib/ai's own terms.
import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => {
  class APIError extends Error {
    status: number | undefined;
    constructor(status?: number, message = "api error") {
      super(message);
      this.status = status;
      this.name = "APIError";
    }
  }
  class APIConnectionError extends APIError {}
  class APIConnectionTimeoutError extends APIConnectionError {}
  class APIUserAbortError extends APIError {}
  const create = vi.fn();
  const constructed: Array<Record<string, unknown>> = [];
  class Anthropic {
    static APIError = APIError;
    static APIConnectionError = APIConnectionError;
    static APIConnectionTimeoutError = APIConnectionTimeoutError;
    static APIUserAbortError = APIUserAbortError;
    messages = { create };
    constructor(options: Record<string, unknown>) {
      constructed.push(options);
    }
  }
  return { Anthropic, APIError, APIConnectionTimeoutError, create, constructed };
});

const aws = vi.hoisted(() => {
  const send = vi.fn();
  const constructed: Array<Record<string, unknown>> = [];
  class BedrockRuntimeClient {
    send = send;
    constructor(options: Record<string, unknown>) {
      constructed.push(options);
    }
  }
  class InvokeModelCommand {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }
  return { BedrockRuntimeClient, InvokeModelCommand, send, constructed };
});

vi.mock("@anthropic-ai/sdk", () => ({ default: sdk.Anthropic }));
vi.mock("@aws-sdk/client-bedrock-runtime", () => ({ BedrockRuntimeClient: aws.BedrockRuntimeClient, InvokeModelCommand: aws.InvokeModelCommand }));

import { createAiClient } from "@/lib/ai/client";
import { memoryWriter } from "@/lib/ai/log";
import { anthropicAdapter } from "@/lib/ai/vendors/anthropic";
import { BEDROCK_ANTHROPIC_VERSION } from "@/lib/ai/vendors/bedrock";
import { JOB, MODEL, pageAnswer, pdfPage } from "./support";

const message = (text: string) => ({
  id: "msg_test",
  model: MODEL,
  content: [{ type: "thinking", thinking: "" }, { type: "text", text }],
  stop_reason: "end_turn",
  stop_details: null,
  usage: { input_tokens: 2_400, output_tokens: 900 },
});

const bedrockPricing = {
  anthropic: {},
  bedrock: { [MODEL]: { inputUsdPerMTok: 4, outputUsdPerMTok: 20 } },
};

beforeEach(() => {
  sdk.create.mockReset();
  sdk.constructed.length = 0;
  aws.send.mockReset();
  aws.constructed.length = 0;
});

describe("the vendor switch", () => {
  it("AI_VENDOR=anthropic calls the Anthropic SDK with the model from AI_MODEL, and never the Bedrock SDK", async () => {
    sdk.create.mockReturnValue({ withResponse: async () => ({ data: message(pageAnswer()), request_id: "req_1" }) });
    const writer = memoryWriter();
    const ai = createAiClient({ writer, env: { AI_VENDOR: "anthropic", AI_MODEL: MODEL, ANTHROPIC_API_KEY: "test-key-not-real" } });
    const result = await ai.extractPage(pdfPage(), "en", { jobId: JOB });
    expect(result.ok).toBe(true);
    expect(sdk.constructed).toEqual([{ apiKey: "test-key-not-real", maxRetries: 0 }]);
    expect(aws.constructed).toHaveLength(0);
    expect(sdk.create.mock.calls[0]![0]).toMatchObject({ model: MODEL });
    expect(writer.rows[0]).toMatchObject({ vendor: "anthropic", model: MODEL, input_tokens: 2_400, output_tokens: 900, request_id: "req_1" });
  });

  it("AI_VENDOR=bedrock calls Bedrock InvokeModel with AWS_BEDROCK_MODEL_ID, and never the Anthropic SDK", async () => {
    const body = new TextEncoder().encode(JSON.stringify({ ...message(pageAnswer()), model: MODEL }));
    aws.send.mockResolvedValue({ body, $metadata: { requestId: "aws-req-1" } });
    const writer = memoryWriter();
    const ai = createAiClient({
      writer,
      env: { AI_VENDOR: "bedrock", AI_MODEL: MODEL, AWS_REGION: "us-east-1", AWS_BEDROCK_MODEL_ID: `us.anthropic.${MODEL}` },
      pricing: bedrockPricing,
    });
    const result = await ai.extractPage(pdfPage(), "en", { jobId: JOB });
    expect(result.ok).toBe(true);
    expect(sdk.constructed).toHaveLength(0);
    expect(aws.constructed).toEqual([{ region: "us-east-1", maxAttempts: 1 }]);
    const [command, options] = aws.send.mock.calls[0]!;
    expect(command.input).toMatchObject({ modelId: `us.anthropic.${MODEL}`, contentType: "application/json" });
    expect(options.abortSignal).toBeInstanceOf(AbortSignal);
    const sent = JSON.parse(new TextDecoder().decode(command.input.body as Uint8Array));
    expect(sent.anthropic_version).toBe(BEDROCK_ANTHROPIC_VERSION);
    expect(sent.model).toBeUndefined();
    expect(sent.messages[0].content[0]).toMatchObject({ type: "document", source: { type: "base64", media_type: "application/pdf" } });
    expect(writer.rows[0]).toMatchObject({ vendor: "bedrock", request_id: "aws-req-1", outcome: "ok" });
  });

  it("refuses Bedrock until its prices are in config/business.ts", async () => {
    const ai = createAiClient({
      writer: memoryWriter(),
      env: { AI_VENDOR: "bedrock", AI_MODEL: MODEL, AWS_REGION: "us-east-1", AWS_BEDROCK_MODEL_ID: `anthropic.${MODEL}` },
    });
    const result = await ai.extractPage(pdfPage(), "en", { jobId: JOB });
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: "config", message: expect.stringContaining("bedrock price") }) });
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("refuses an unknown vendor, a model without a price, and a Bedrock id that is not AI_MODEL's", async () => {
    const cases = [
      { AI_VENDOR: "openai", AI_MODEL: MODEL, ANTHROPIC_API_KEY: "k" },
      { AI_VENDOR: "anthropic", AI_MODEL: "claude-unknown-9", ANTHROPIC_API_KEY: "k" },
      { AI_VENDOR: "anthropic", AI_MODEL: MODEL },
      { AI_VENDOR: "bedrock", AI_MODEL: MODEL, AWS_REGION: "us-east-1", AWS_BEDROCK_MODEL_ID: "anthropic.claude-sonnet-5-5" },
    ];
    for (const env of cases) {
      const ai = createAiClient({ writer: memoryWriter(), env, pricing: { anthropic: { [MODEL]: { inputUsdPerMTok: 4, outputUsdPerMTok: 20 } }, bedrock: bedrockPricing.bedrock } });
      const result = await ai.extractPage(pdfPage(), "en", { jobId: JOB });
      expect(result.ok || result.error.code).toBe("config");
    }
    expect(sdk.create).not.toHaveBeenCalled();
    expect(aws.send).not.toHaveBeenCalled();
  });
});

describe("the Anthropic adapter", () => {
  const request = {
    model: MODEL,
    system: "fixed system prompt",
    content: [
      { type: "document" as const, mediaType: "application/pdf" as const, data: "JVBERi0=" },
      { type: "text" as const, text: "Transcribe the page above." },
    ],
    maxTokens: 16_000,
    effort: "medium" as const,
    outputSchema: null,
    timeoutMs: 120_000,
  };

  it("sends a plain Messages call: no tools, no cache_control, no thinking override, one deadline, no retries", async () => {
    sdk.create.mockReturnValue({ withResponse: async () => ({ data: message("{}"), request_id: "req_2" }) });
    const answer = await anthropicAdapter({ apiKey: "test-key-not-real" }).call(request);
    const [params, options] = sdk.create.mock.calls[0]!;
    expect(Object.keys(params).sort()).toEqual(["max_tokens", "messages", "model", "output_config", "system"]);
    expect(params).toMatchObject({
      model: MODEL,
      max_tokens: 16_000,
      system: "fixed system prompt",
      output_config: { effort: "medium" },
      messages: [{ role: "user", content: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: "JVBERi0=" } }, { type: "text" }] }],
    });
    expect(JSON.stringify(params)).not.toMatch(/"tools"|tool_choice|cache_control|"thinking"/);
    expect(options).toMatchObject({ timeout: 120_000, maxRetries: 0 });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    // Thinking blocks are not text.
    expect(answer).toEqual({ text: "{}", inputTokens: 2_400, outputTokens: 900, stopReason: "end_turn", stopDetail: null, model: MODEL, requestId: "req_2" });
  });

  it("sends the output schema as output_config.format when structured outputs are on", async () => {
    sdk.create.mockReturnValue({ withResponse: async () => ({ data: message("{}"), request_id: null }) });
    await anthropicAdapter({ apiKey: "k" }).call({ ...request, outputSchema: { type: "object", additionalProperties: false } });
    expect(sdk.create.mock.calls[0]![0].output_config).toEqual({
      effort: "medium",
      format: { type: "json_schema", schema: { type: "object", additionalProperties: false } },
    });
  });

  it("maps a refusal's category", async () => {
    sdk.create.mockReturnValue({
      withResponse: async () => ({ data: { ...message(""), stop_reason: "refusal", stop_details: { category: "bio" } }, request_id: null }),
    });
    const answer = await anthropicAdapter({ apiKey: "k" }).call(request);
    expect(answer).toMatchObject({ stopReason: "refusal", stopDetail: "bio" });
  });

  it("maps SDK errors to timeout, unavailable and rejected", async () => {
    const adapter = anthropicAdapter({ apiKey: "k" });
    const cases: Array<[Error, string, number | null]> = [
      [new sdk.APIConnectionTimeoutError(undefined, "timed out"), "timeout", null],
      [new sdk.APIError(529, "overloaded"), "unavailable", 529],
      [new sdk.APIError(429, "rate limited"), "unavailable", 429],
      [new sdk.APIError(400, "bad request"), "rejected", 400],
      [new sdk.APIError(401, "bad key"), "rejected", 401],
    ];
    for (const [error, kind, status] of cases) {
      sdk.create.mockReturnValueOnce({ withResponse: async () => Promise.reject(error) });
      await expect(adapter.call(request)).rejects.toMatchObject({ name: "VendorError", kind, status });
    }
  });
});
