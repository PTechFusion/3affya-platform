// Which vendor and model lib/ai calls, read from the environment (ADR-3: the vendor is configuration, the model id is pinned
// in env and never written in code). The same AI_VENDOR and AI_MODEL that /admin/ai-jobs shows (lib/ai-jobs.ts aiConfig).
//   AI_VENDOR             anthropic | bedrock
//   AI_MODEL              the Claude model id; also the key of its price in config/business.ts aiPricing
//   ANTHROPIC_API_KEY     anthropic only
//   AWS_REGION            bedrock only
//   AWS_BEDROCK_MODEL_ID  bedrock only: the Bedrock model or inference-profile id of AI_MODEL (e.g. us.anthropic.<AI_MODEL>)
// A model without a price is refused, so every ai_calls row carries a cost. Error messages name a variable, never its value.
import { aiPricing, type AiModelPrice } from "@/config/business";
import type { VendorName } from "./vendors/types";

export type AiConfig =
  | { vendor: "anthropic"; model: string; invokeModel: string; apiKey: string; price: AiModelPrice }
  | { vendor: "bedrock"; model: string; invokeModel: string; region: string; price: AiModelPrice };

export type AiPricing = { [V in VendorName]: Record<string, AiModelPrice> };

export type Env = Record<string, string | undefined>;

const VENDORS: readonly VendorName[] = ["anthropic", "bedrock"];

/** "us.anthropic.claude-x-y-v1:0" and "anthropic.claude-x-y" both name "claude-x-y". */
export function baseModelId(bedrockModelId: string): string {
  return bedrockModelId
    .replace(/^(?:[a-z]{2,6}\.)?anthropic\./, "")
    .replace(/-v\d+(?::\d+)?$/, "")
    .replace(/:\d+$/, "");
}

const value = (env: Env, name: string) => env[name]?.trim() || null;

export function readAiConfig(env: Env = process.env, pricing: AiPricing = aiPricing): { ok: true; config: AiConfig } | { ok: false; error: string } {
  const vendor = value(env, "AI_VENDOR");
  if (!vendor) return { ok: false, error: "AI_VENDOR is not set (anthropic or bedrock, see .env.example)" };
  if (!(VENDORS as readonly string[]).includes(vendor)) return { ok: false, error: "AI_VENDOR must be anthropic or bedrock" };
  const model = value(env, "AI_MODEL");
  if (!model) return { ok: false, error: "AI_MODEL is not set (a Claude model id, see .env.example)" };
  const price = pricing[vendor as VendorName][model];
  if (!price) {
    return { ok: false, error: `AI_MODEL has no ${vendor} price in config/business.ts aiPricing; add the vendor's price before using it` };
  }
  if (vendor === "anthropic") {
    const apiKey = value(env, "ANTHROPIC_API_KEY");
    if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY is not set (AI_VENDOR is anthropic)" };
    return { ok: true, config: { vendor, model, invokeModel: model, apiKey, price } };
  }
  const region = value(env, "AWS_REGION");
  if (!region) return { ok: false, error: "AWS_REGION is not set (AI_VENDOR is bedrock)" };
  const bedrockModelId = value(env, "AWS_BEDROCK_MODEL_ID");
  if (!bedrockModelId) return { ok: false, error: "AWS_BEDROCK_MODEL_ID is not set (AI_VENDOR is bedrock)" };
  if (baseModelId(bedrockModelId) !== model) return { ok: false, error: "AWS_BEDROCK_MODEL_ID is not the Bedrock id of AI_MODEL" };
  return { ok: true, config: { vendor: "bedrock", model, invokeModel: bedrockModelId, region, price } };
}
