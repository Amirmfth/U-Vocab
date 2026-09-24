// Standard text-token prices verified against the official OpenAI model/pricing pages on 2026-09-25.
// Costs are stored on each usage event so later price changes do not alter history.
export type ModelPricing = {
  key: string;
  provider: string;
  model: string;
  currency: "USD";
  inputPerMillion: number;
  cachedInputPerMillion: number;
  outputPerMillion: number;
};

const OPENAI_STANDARD_2026_09_25: ModelPricing[] = [
  {
    key: "openai-standard-2026-09-25:gpt-5-mini",
    provider: "openai",
    model: "gpt-5-mini",
    currency: "USD",
    inputPerMillion: 0.25,
    cachedInputPerMillion: 0.025,
    outputPerMillion: 2,
  },
  {
    key: "openai-standard-2026-09-25:gpt-5-mini-2025-08-07",
    provider: "openai",
    model: "gpt-5-mini-2025-08-07",
    currency: "USD",
    inputPerMillion: 0.25,
    cachedInputPerMillion: 0.025,
    outputPerMillion: 2,
  },
  {
    key: "openai-standard-2026-09-25:gpt-5",
    provider: "openai",
    model: "gpt-5",
    currency: "USD",
    inputPerMillion: 1.25,
    cachedInputPerMillion: 0.125,
    outputPerMillion: 10,
  },
  {
    key: "openai-standard-2026-09-25:gpt-6-luna",
    provider: "openai",
    model: "gpt-6-luna",
    currency: "USD",
    inputPerMillion: 0.1,
    cachedInputPerMillion: 0.01,
    outputPerMillion: 0.5,
  },
  {
    key: "openai-standard-2026-09-25:text-embedding-3-small",
    provider: "openai",
    model: "text-embedding-3-small",
    currency: "USD",
    inputPerMillion: 0.02,
    cachedInputPerMillion: 0,
    outputPerMillion: 0,
  },
];

export function pricingFor(provider: string, model: string) {
  return OPENAI_STANDARD_2026_09_25.find(
    (pricing) => pricing.provider === provider && pricing.model === model,
  ) ?? null;
}

export function calculateUsageCost(input: {
  provider: string;
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}) {
  const pricing = pricingFor(input.provider, input.model);
  if (!pricing) {
    return {
      pricingKey: null,
      currency: "USD" as const,
      inputCost: null,
      cachedInputCost: null,
      outputCost: null,
      reasoningCost: null,
      totalCost: null,
    };
  }

  const cachedInputTokens = Math.min(
    Math.max(0, input.cachedInputTokens),
    Math.max(0, input.inputTokens),
  );
  const uncachedInputTokens = Math.max(0, input.inputTokens - cachedInputTokens);
  const outputTokens = Math.max(0, input.outputTokens);
  const reasoningTokens = Math.min(
    Math.max(0, input.reasoningTokens),
    outputTokens,
  );

  const inputCost =
    (uncachedInputTokens / 1_000_000) * pricing.inputPerMillion;
  const cachedInputCost =
    (cachedInputTokens / 1_000_000) * pricing.cachedInputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  const reasoningCost =
    (reasoningTokens / 1_000_000) * pricing.outputPerMillion;

  return {
    pricingKey: pricing.key,
    currency: pricing.currency,
    inputCost,
    cachedInputCost,
    outputCost,
    reasoningCost,
    totalCost: inputCost + cachedInputCost + outputCost,
  };
}
