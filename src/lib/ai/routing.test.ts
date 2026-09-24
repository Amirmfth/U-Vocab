import assert from "node:assert/strict";
import test from "node:test";
import { AI_OPERATION_BUDGETS, aiRoute } from "./routing";

test("focused operations use tighter output budgets than long-form generation", () => {
  assert.ok(
    AI_OPERATION_BUDGETS.answer_evaluation.maxOutputTokens <
      AI_OPERATION_BUDGETS.writing_evaluation.maxOutputTokens,
  );
  assert.ok(
    AI_OPERATION_BUDGETS.conversation_tutor.maxOutputTokens <
      AI_OPERATION_BUDGETS.story_generation.maxOutputTokens,
  );
});

test("every configured operation has a model and positive output budget", () => {
  for (const [operation, route] of Object.entries(AI_OPERATION_BUDGETS)) {
    assert.ok(route.model, operation + " must have a model");
    assert.ok(route.maxOutputTokens > 0, operation + " must have an output budget");
  }
});

test("aiRoute returns the configured operation budget", () => {
  const route = aiRoute("reading_analysis");
  assert.equal(
    route.maxOutputTokens,
    AI_OPERATION_BUDGETS.reading_analysis.maxOutputTokens,
  );
});
