import assert from "node:assert/strict";
import test from "node:test";
import { selectExerciseType } from "./select";

test("article mistakes are targeted first", () => {
  assert.equal(
    selectExerciseType({
      recognition: 0.9,
      meaningRecall: 0.9,
      production: 0.9,
      contextualUsage: 0.9,
      mistakeTypes: ["ARTICLE"],
    }),
    "ARTICLE",
  );
});

test("production gap leads to production-oriented exercise", () => {
  const type = selectExerciseType({
    recognition: 0.9,
    meaningRecall: 0.9,
    production: 0.2,
    contextualUsage: 0.7,
    mistakeTypes: [],
  });

  assert.ok(["REVERSE_RECALL", "CASE_PREPOSITION", "COLLOCATION"].includes(type));
});
