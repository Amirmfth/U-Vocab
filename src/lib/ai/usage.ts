import { db } from "@/lib/db";
import { AI_PROVIDER } from "./client";
import { promptVersionFor } from "./prompt-versions";
import { calculateUsageCost } from "./pricing";

export type AIUsageLike = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
  input_tokens_details?: {
    cached_tokens?: number | null;
  } | null;
  output_tokens_details?: {
    reasoning_tokens?: number | null;
  } | null;
};

type SafeMetadataValue = string | number | boolean | null | undefined;

const SENSITIVE_METADATA_KEYS = new Set([
  "answer",
  "content",
  "draft",
  "instructions",
  "message",
  "prompt",
  "response",
  "text",
]);

function sanitizeMetadata(
  metadata: Record<string, SafeMetadataValue> | undefined,
) {
  if (!metadata) return undefined;
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) =>
        value !== undefined && !SENSITIVE_METADATA_KEYS.has(key.toLowerCase()),
      )
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value.slice(0, 160) : value ?? null,
      ]),
  );
}

export async function recordAIUsage(input: {
  userId: string;
  operation: string;
  model: string;
  provider?: string;
  promptVersion?: string;
  status: "SUCCESS" | "ERROR";
  usage?: AIUsageLike | null;
  requestId?: string | null;
  errorMessage?: string | null;
  errorCategory?: string | null;
  retryCount?: number | null;
  durationMs?: number | null;
  timeToFirstTokenMs?: number | null;
  metadata?: Record<string, SafeMetadataValue>;
}) {
  try {
    const provider = input.provider ?? AI_PROVIDER;
    const inputTokens = input.usage?.input_tokens ?? 0;
    const cachedInputTokens =
      input.usage?.input_tokens_details?.cached_tokens ?? 0;
    const outputTokens = input.usage?.output_tokens ?? 0;
    const reasoningTokens =
      input.usage?.output_tokens_details?.reasoning_tokens ?? 0;
    const totalTokens =
      input.usage?.total_tokens ?? inputTokens + outputTokens;

    const cost = calculateUsageCost({
      provider,
      model: input.model,
      inputTokens,
      cachedInputTokens,
      outputTokens,
      reasoningTokens,
    });

    await db.aiUsageEvent.create({
      data: {
        userId: input.userId,
        operation: input.operation,
        provider,
        model: input.model,
        promptVersion:
          input.promptVersion ?? promptVersionFor(input.operation),
        status: input.status,
        inputTokens,
        cachedInputTokens,
        outputTokens,
        reasoningTokens,
        totalTokens,
        inputCost: cost.inputCost,
        cachedInputCost: cost.cachedInputCost,
        outputCost: cost.outputCost,
        reasoningCost: cost.reasoningCost,
        totalCost: cost.totalCost,
        currency: cost.currency,
        pricingKey: cost.pricingKey,
        durationMs: input.durationMs ?? null,
        timeToFirstTokenMs: input.timeToFirstTokenMs ?? null,
        requestId: input.requestId ?? null,
        errorMessage: input.errorMessage?.slice(0, 500) ?? null,
        errorCategory: input.errorCategory?.slice(0, 80) ?? null,
        retryCount: input.retryCount ?? null,
        metadata: sanitizeMetadata(input.metadata),
      },
    });
  } catch (error) {
    console.error("Failed to persist AI usage", error);
  }
}
