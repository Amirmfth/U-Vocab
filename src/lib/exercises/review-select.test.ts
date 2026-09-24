import assert from "node:assert/strict";
import test from "node:test";
import { selectReviewExerciseType } from "./review-select";

test("strong vocabulary receives a production-heavy review", () => {
  const type = selectReviewExerciseType(
    {
      recognition: 0.9,
      meaningRecall: 0.9,
      production: 0.8,
      contextualUsage: 0.8,
      mistakeTypes: [],
    },
    ["MEANING_RECALL", "CLOZE"],
  );

  assert.ok(
    ["COLLOCATION", "CASE_PREPOSITION", "FREE_SENTENCE", "PARAPHRASE"].includes(type),
  );
});

test("recent review formats are rotated", () => {
  const type = selectReviewExerciseType(
    {
      recognition: 0.5,
      meaningRecall: 0.3,
      production: 0.2,
      contextualUsage: 0.2,
      mistakeTypes: [],
    },
    ["REVERSE_RECALL", "MEANING_RECALL"],
  );

  assert.notEqual(type, "REVERSE_RECALL");
});
