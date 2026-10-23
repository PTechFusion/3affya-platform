// What lib/ai asks of a vendor, in its own terms, so the client never touches a vendor SDK (ADR-3: the vendor is configuration).
// There are exactly two adapters, one per SDK: anthropic.ts (@anthropic-ai/sdk) and bedrock.ts (@aws-sdk/client-bedrock-runtime).
// A request is one user turn: the fixed system prompt plus content blocks. No tools, no tool choice, no prompt caching, no
// Batch or Files API (ADR-3's BAA limits, ADR-4: no tools during extraction); nothing in this type can express them.

export type VendorName = "anthropic" | "bedrock";

export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/** A content block. Documents and images travel inline, base64, as data inside a fixed template (ADR-4). */
export type VendorContent =
  | { type: "document"; mediaType: "application/pdf"; data: string }
  | { type: "image"; mediaType: ImageMime; data: string }
  | { type: "text"; text: string };

export type Effort = "low" | "medium" | "high";

export interface VendorRequest {
  /** The id the vendor is called with: AI_MODEL for anthropic, AWS_BEDROCK_MODEL_ID for bedrock. */
  model: string;
  system: string;
  content: VendorContent[];
  maxTokens: number;
  effort: Effort | null;
  /** Sent as output_config.format when structured outputs are on (config/business.ts aiClient.structuredOutputs). */
  outputSchema: Record<string, unknown> | null;
  /** The whole call's deadline (architecture: AI 120 s per page). The adapter makes no retries of its own. */
  timeoutMs: number;
}

export interface VendorResponse {
  /** The response's text blocks, joined. Thinking blocks are not text and are left out. */
  text: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
  /** The refusal category when stopReason is "refusal". */
  stopDetail: string | null;
  /** The model that answered, as the vendor reports it. */
  model: string;
  requestId: string | null;
}

/**
 * timeout: the deadline passed. unavailable: rate limit, overload, a 5xx or the network (worth retrying later, which the
 * pipeline's backoff does). rejected: the vendor refused the request itself (a 4xx: bad request, auth, model access).
 */
export type VendorFailureKind = "timeout" | "unavailable" | "rejected";

export class VendorError extends Error {
  readonly kind: VendorFailureKind;
  readonly status: number | null;
  constructor(kind: VendorFailureKind, message: string, status: number | null = null) {
    super(message);
    this.name = "VendorError";
    this.kind = kind;
    this.status = status;
  }
}

export interface VendorAdapter {
  readonly name: VendorName;
  call(request: VendorRequest): Promise<VendorResponse>;
}
