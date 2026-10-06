import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_OPERATION_BUDGETS,
  aiRoute,
  conversationFinalComplexity,
  writingEvaluationComplexity,
} from "./routing";

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


test("decision operations use the fast model class and tiny output budgets", () => {
  for (const operation of [
    "recommendation_rerank",
    "lexical_edge_rerank",
    "daily_session_plan",
  ] as const) {
    const route = aiRoute(operation);
    assert.equal(route.routeClass, "FAST");
    assert.ok(route.maxOutputTokens <= 500);
    assert.equal(route.reason, "STATIC_FAST");
  }
});

test("request complexity can move eligible evaluation between fast and complex routes", () => {
  assert.equal(
    writingEvaluationComplexity({ draftChars: 500, level: "B1", targetCount: 4 }),
    "FAST",
  );
  assert.equal(
    writingEvaluationComplexity({ draftChars: 3000, level: "C1", targetCount: 10 }),
    "COMPLEX",
  );
  assert.equal(
    conversationFinalComplexity({ messageCount: 6, level: "B1", targetCount: 4 }),
    "FAST",
  );

  const fast = aiRoute("writing_evaluation", { complexity: "FAST" });
  assert.equal(fast.reason, "REQUEST_COMPLEXITY_FAST");
  assert.equal(fast.routeClass, "FAST");
});

test("per-operation environment override wins and remains observable", () => {
  const key = "OPENAI_MODEL_DAILY_SESSION_PLAN";
  const previous = process.env[key];
  process.env[key] = "test-model";
  try {
    const route = aiRoute("daily_session_plan");
    assert.equal(route.model, "test-model");
    assert.equal(route.reason, "ENV_OVERRIDE");
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});

test("current defaults do not fall back to the old gpt-5-mini complex route", () => {
  const route = aiRoute("grammar_lesson");
  assert.notEqual(route.model, "gpt-5-mini");
});
