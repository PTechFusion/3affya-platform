// The Bedrock adapter: Claude on AWS Bedrock in Dr Ayman's AWS account, the dated fallback of ADR-3 (switch AI_VENDOR on
// 14 Nov if the Anthropic HIPAA organisation is not provisioned). The only file that imports @aws-sdk/client-bedrock-runtime.
// InvokeModel with the Messages body (the same one the Anthropic adapter sends), one deadline per call, no SDK retries.
// Credentials come from the AWS SDK's default chain (environment or instance role); nothing here reads a key.
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { messagesBody } from "./messages-body";
import { VendorError, type VendorAdapter, type VendorRequest, type VendorResponse } from "./types";

/** The Messages API version Bedrock's InvokeModel expects in the body for Claude. */
export const BEDROCK_ANTHROPIC_VERSION = "bedrock-2023-05-31";

interface BedrockMessage {
  model?: string;
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string | null;
  stop_details?: { category?: string | null } | null;
  usage?: { input_tokens?: number; output_tokens?: number };
}

const UNAVAILABLE = new Set([
  "ThrottlingException",
  "ServiceUnavailableException",
  "InternalServerException",
  "ModelNotReadyException",
  "ServiceQuotaExceededException",
]);

function toVendorError(error: unknown): VendorError {
  const name = error instanceof Error ? error.name : "";
  if (name === "AbortError" || name === "TimeoutError" || name === "ModelTimeoutException") {
    return new VendorError("timeout", "Bedrock did not answer within the call's deadline");
  }
  const status = (error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata?.httpStatusCode ?? null;
  if (UNAVAILABLE.has(name) || status === 429 || (status !== null && status >= 500)) {
    return new VendorError("unavailable", `Bedrock error ${status ?? "without a status"} (${name || "unknown"})`, status);
  }
  if (status !== null && status >= 400) return new VendorError("rejected", `Bedrock refused the request ${status} (${name})`, status);
  return new VendorError("unavailable", `the Bedrock call failed (${name || "unknown"})`, status);
}

export function bedrockAdapter(options: { region: string }): VendorAdapter {
  const client = new BedrockRuntimeClient({ region: options.region, maxAttempts: 1 });
  return {
    name: "bedrock",
    async call(request: VendorRequest): Promise<VendorResponse> {
      const body = { anthropic_version: BEDROCK_ANTHROPIC_VERSION, ...messagesBody(request) };
      let raw: Uint8Array;
      let requestId: string | null = null;
      try {
        const output = await client.send(
          new InvokeModelCommand({
            modelId: request.model,
            contentType: "application/json",
            accept: "application/json",
            body: new TextEncoder().encode(JSON.stringify(body)),
          }),
          { abortSignal: AbortSignal.timeout(request.timeoutMs) },
        );
        raw = output.body;
        requestId = output.$metadata.requestId ?? null;
      } catch (error) {
        throw toVendorError(error);
      }
      let message: BedrockMessage;
      try {
        message = JSON.parse(new TextDecoder().decode(raw)) as BedrockMessage;
      } catch {
        throw new VendorError("unavailable", "Bedrock answered with a body that is not JSON");
      }
      return {
        text: (message.content ?? []).flatMap((b) => (b.type === "text" && typeof b.text === "string" ? [b.text] : [])).join(""),
        inputTokens: message.usage?.input_tokens ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
        stopReason: message.stop_reason ?? null,
        stopDetail: message.stop_reason === "refusal" ? (message.stop_details?.category ?? null) : null,
        model: message.model ?? request.model,
        requestId,
      };
    },
  };
}
