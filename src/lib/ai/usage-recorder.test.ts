import assert from "node:assert/strict";
import test from "node:test";
import type { AIUsageRecordInput } from "./usage";
import { createAIUsageRecorder } from "./usage-recorder";

function persistenceSpy() {
  const calls: AIUsageRecordInput[] = [];
  const persist = async (input: AIUsageRecordInput) => {
    calls.push(input);
  };
  return { calls, persist };
}

test("successful request is persisted once with provider usage", async () => {
  const spy = persistenceSpy();
  const recorder = createAIUsageRecorder(
    {
      userId: "user-1",
      operation: "test_operation",
      model: "gpt-5-mini",
      metadata: { inputChars: 42 },
    },
    spy.persist,
  );

  await recorder.success({
    id: "resp-1",
    usage: {
      input_tokens: 20,
      output_tokens: 10,
      total_tokens: 30,
      input_tokens_details: { cached_tokens: 5 },
      output_tokens_details: { reasoning_tokens: 3 },
    },
  });

  assert.equal(spy.calls.length, 1);
  assert.equal(spy.calls[0].status, "SUCCESS");
  assert.equal(spy.calls[0].requestId, "resp-1");
  assert.equal(spy.calls[0].usage?.input_tokens_details?.cached_tokens, 5);
  assert.equal(spy.calls[0].metadata?.inputChars, 42);
});

test("failed request is persisted once with an error category", async () => {
  const spy = persistenceSpy();
  const recorder = createAIUsageRecorder(
    {
      userId: "user-1",
      operation: "test_operation",
      model: "gpt-5-mini",
    },
    spy.persist,
  );

  await recorder.failure(new Error("request timeout"));

  assert.equal(spy.calls.length, 1);
  assert.equal(spy.calls[0].status, "ERROR");
  assert.equal(spy.calls[0].errorCategory, "timeout");
});

test("parse failure cannot double-log in the catch path", async () => {
  const spy = persistenceSpy();
  const recorder = createAIUsageRecorder(
    {
      userId: "user-1",
      operation: "test_operation",
      model: "gpt-5-mini",
    },
    spy.persist,
  );
  const error = new Error("OpenAI did not return a valid result.");

  await recorder.failure(error, {
    id: "resp-parse",
    usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 },
  });
  await recorder.failure(error);

  assert.equal(spy.calls.length, 1);
  assert.equal(spy.calls[0].requestId, "resp-parse");
  assert.equal(spy.calls[0].usage?.total_tokens, 12);
});
