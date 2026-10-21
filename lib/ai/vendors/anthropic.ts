// The Anthropic adapter: Claude through the Anthropic API (ADR-3: a HIPAA-ready API organisation in Dr Ayman's name). The only
// file that imports @anthropic-ai/sdk. Plain Messages calls with inline documents, as the BAA requires: no Batch API, no Files
// API, no prompt caching, no tools. One deadline per call and no SDK retries: the client retries invalid output once and the
// pipeline's backoff (task 3.8) retries outages, so a hidden SDK retry cannot stretch a call past its 120 s.
import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages/messages";
import { messagesBody } from "./messages-body";
import { VendorError, type VendorAdapter, type VendorRequest, type VendorResponse } from "./types";

function toVendorError(error: unknown): VendorError {
  if (error instanceof Anthropic.APIConnectionTimeoutError || error instanceof Anthropic.APIUserAbortError) {
    return new VendorError("timeout", "the Anthropic API did not answer within the call's deadline");
  }
  if (error instanceof Anthropic.APIConnectionError) return new VendorError("unavailable", "could not reach the Anthropic API");
  if (error instanceof Anthropic.APIError) {
    const status = typeof error.status === "number" ? error.status : null;
    // 408, 409, 429, 5xx and 529 (overloaded) are worth retrying later; every other 4xx is the request itself.
    const retryable = status === null || status === 408 || status === 409 || status === 429 || status >= 500;
    return new VendorError(retryable ? "unavailable" : "rejected", `Anthropic API error ${status ?? "without a status"} (${error.name})`, status);
  }
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return new VendorError("timeout", "the Anthropic API did not answer within the call's deadline");
  }
  return new VendorError("unavailable", "the Anthropic API call failed");
}

export function anthropicAdapter(options: { apiKey: string }): VendorAdapter {
  const client = new Anthropic({ apiKey: options.apiKey, maxRetries: 0 });
  return {
    name: "anthropic",
    async call(request: VendorRequest): Promise<VendorResponse> {
      const params: MessageCreateParamsNonStreaming = { model: request.model, ...messagesBody(request) };
      try {
        const { data, request_id } = await client.messages
          .create(params, { timeout: request.timeoutMs, maxRetries: 0, signal: AbortSignal.timeout(request.timeoutMs) })
          .withResponse();
        const text = data.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
        return {
          text,
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          stopReason: data.stop_reason ?? null,
          stopDetail: data.stop_reason === "refusal" ? (data.stop_details?.category ?? null) : null,
          model: data.model,
          requestId: request_id ?? null,
        };
      } catch (error) {
        throw toVendorError(error);
      }
    },
  };
}
