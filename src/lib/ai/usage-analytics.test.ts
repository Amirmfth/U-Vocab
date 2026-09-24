import assert from "node:assert/strict";
import test from "node:test";
import { groupUsageBy, summarizeUsage } from "./usage-analytics";

const events = [
  {
    operation: "reading_analysis",
    model: "gpt-5-mini",
    status: "SUCCESS" as const,
    inputTokens: 100,
    cachedInputTokens: 20,
    outputTokens: 50,
    totalTokens: 150,
    totalCost: 0.001,
    durationMs: 1000,
  },
  {
    operation: "reading_analysis",
    model: "gpt-5-mini",
    status: "ERROR" as const,
    inputTokens: 40,
    cachedInputTokens: 0,
    outputTokens: 0,
    totalTokens: 40,
    totalCost: null,
    durationMs: 500,
  },
  {
    operation: "writing_evaluation",
    model: "gpt-5",
    status: "SUCCESS" as const,
    inputTokens: 200,
    cachedInputTokens: 0,
    outputTokens: 100,
    totalTokens: 300,
    totalCost: 0.01,
    durationMs: 2000,
  },
];

test("summarizes cost tokens failures and latency", () => {
  const summary = summarizeUsage(events);

  assert.equal(summary.requests, 3);
  assert.equal(summary.failures, 1);
  assert.equal(summary.unpricedRequests, 1);
  assert.equal(summary.inputTokens, 340);
  assert.equal(summary.outputTokens, 150);
  assert.equal(summary.totalCost, 0.011);
  assert.equal(summary.averageLatencyMs, 3500 / 3);
});

test("groups request analytics by operation", () => {
  const groups = groupUsageBy(events, "operation");
  const reading = groups.find((item) => item.name === "reading_analysis");

  assert.ok(reading);
  assert.equal(reading.requests, 2);
  assert.equal(reading.failures, 1);
  assert.equal(reading.unpricedRequests, 1);
});
