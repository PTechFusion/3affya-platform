// The Messages API body both adapters send: the Anthropic API takes it with `model`, Bedrock's InvokeModel takes it with
// `anthropic_version` (the model is the command's modelId). One builder, so the two vendors receive the same request.
// Deliberately absent: tools and tool_choice (ADR-4), cache_control (ADR-3: no explicit prompt caching under the BAA), thinking
// (Claude 5 models think adaptively by default; `effort` is the one control), temperature (rejected by Claude 5 models).
import type { VendorContent, VendorRequest } from "./types";

export type MessagesContentBlock =
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string } }
  | { type: "text"; text: string };

export interface MessagesBody {
  max_tokens: number;
  system: string;
  messages: Array<{ role: "user"; content: MessagesContentBlock[] }>;
  output_config?: {
    effort?: "low" | "medium" | "high";
    format?: { type: "json_schema"; schema: Record<string, unknown> };
  };
}

function block(content: VendorContent): MessagesContentBlock {
  switch (content.type) {
    case "document":
      return { type: "document", source: { type: "base64", media_type: content.mediaType, data: content.data } };
    case "image":
      return { type: "image", source: { type: "base64", media_type: content.mediaType, data: content.data } };
    case "text":
      return { type: "text", text: content.text };
  }
}

export function messagesBody(request: VendorRequest): MessagesBody {
  const body: MessagesBody = {
    max_tokens: request.maxTokens,
    system: request.system,
    messages: [{ role: "user", content: request.content.map(block) }],
  };
  const outputConfig: NonNullable<MessagesBody["output_config"]> = {};
  if (request.effort) outputConfig.effort = request.effort;
  if (request.outputSchema) outputConfig.format = { type: "json_schema", schema: request.outputSchema };
  if (Object.keys(outputConfig).length > 0) body.output_config = outputConfig;
  return body;
}
