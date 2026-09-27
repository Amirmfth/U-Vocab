import assert from "node:assert/strict";
import test from "node:test";
import { scoreReadingAssessment } from "./assessment";

test("mere reading exposure produces no grammar evidence", () => {
  const result = scoreReadingAssessment(
    [{
      type: "COMPREHENSION",
      correctIndex: 1,
      grammarConceptId: null,
    }],
    [1],
  );
  assert.equal(result.score, 1);
  assert.deepEqual(result.grammarEvidence, []);
});

test("only an explicit grammar comprehension question produces recognition evidence", () => {
  const result = scoreReadingAssessment(
    [
      { type: "GRAMMAR", correctIndex: 2, grammarConceptId: "de.case.dative" },
      { type: "VOCABULARY", correctIndex: 0, grammarConceptId: null },
    ],
    [2, 1],
  );
  assert.deepEqual(result.correct, [true, false]);
  assert.deepEqual(result.grammarEvidence, [{
    grammarConceptId: "de.case.dative",
    correct: true,
    questionIndex: 0,
  }]);
});
