import assert from "node:assert/strict";
import test from "node:test";
import { checkDeterministicAnswer } from "./check";
import { buildGrammarExercise } from "./grammar";

test("grammar reorder accepts normalized deterministic answer", () => {
  const exercise = buildGrammarExercise(
    "de.conjunction.subordinate-verb-final",
    "weil-order",
  );
  assert.ok(exercise);
  assert.equal(
    checkDeterministicAnswer(
      "Weil ich heute keine Zeit habe.",
      exercise!.expected,
    ).correct,
    true,
  );
});
