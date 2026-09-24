import assert from "node:assert/strict";
import test from "node:test";
import { calculateUsageCost, pricingFor } from "./pricing";

test("calculates gpt-5-mini request-time cost", () => {
  const result = calculateUsageCost({
    provider: "openai",
    model: "gpt-5-mini",
    inputTokens: 1_000_000,
    cachedInputTokens: 0,
    outputTokens: 1_000_000,
    reasoningTokens: 0,
  });

  assert.equal(result.pricingKey, "openai-standard-2026-09-25:gpt-5-mini");
  assert.equal(result.inputCost, 0.25);
  assert.equal(result.outputCost, 2);
  assert.equal(result.totalCost, 2.25);
});

test("prices cached input separately from uncached input", () => {
  const result = calculateUsageCost({
    provider: "openai",
    model: "gpt-5-mini",
    inputTokens: 1_000_000,
    cachedInputTokens: 600_000,
    outputTokens: 0,
    reasoningTokens: 0,
  });

  assert.equal(result.inputCost, 0.1);
  assert.equal(result.cachedInputCost, 0.015);
  assert.equal(result.totalCost, 0.115);
});

test("reasoning cost is reported as a subset of output cost", () => {
  const result = calculateUsageCost({
    provider: "openai",
    model: "gpt-5-mini",
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 100_000,
    reasoningTokens: 40_000,
  });

  assert.equal(result.outputCost, 0.2);
  assert.equal(result.reasoningCost, 0.08);
  assert.equal(result.totalCost, 0.2);
});

test("unknown model pricing remains explicitly unavailable", () => {
  assert.equal(pricingFor("openai", "future-model"), null);

  const result = calculateUsageCost({
    provider: "openai",
    model: "future-model",
    inputTokens: 100,
    cachedInputTokens: 0,
    outputTokens: 100,
    reasoningTokens: 0,
  });

  assert.equal(result.pricingKey, null);
  assert.equal(result.totalCost, null);
});
