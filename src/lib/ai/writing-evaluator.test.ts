import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateWritingOverall,
  writingEvaluationSchema,
} from "./writing-evaluator";

function baseEvaluation() {
  return {
    taskCompletion: 0.8,
    organization: 0.8,
    grammar: 0.8,
    vocabularyRange: 0.8,
    vocabularyAccuracy: 0.8,
    naturalness: 0.8,
    overall: 0.8,
    summary: "Solid.",
    strengths: [],
    improvements: [],
    targetUsage: [],
    repetition: [],
    collocationFeedback: [],
    lexicalMistakes: [],
    grammarObservations: [],
    strongerVocabulary: [],
    corrections: [],
    improvedVersion: "Text",
  };
}

test("writing evaluation distinguishes grammar error, success, and opportunity", () => {
  const parsed = writingEvaluationSchema.parse({
    ...baseEvaluation(),
    grammarObservations: [
      {
        grammarConceptId: "de.case.dative",
        signal: "ERROR",
        original: "mit mein Bruder",
        corrected: "mit meinem Bruder",
        explanation: "Dative required.",
        confidence: 0.95,
      },
      {
        grammarConceptId: "de.relative.basic",
        signal: "SUCCESS",
        original: "der Mann, der hier arbeitet",
        corrected: null,
        explanation: "Correct relative clause.",
        confidence: 0.92,
      },
      {
        grammarConceptId: "de.subjunctive.konjunktiv-ii-hypothetical",
        signal: "OPPORTUNITY",
        original: "Wenn ich mehr Geld habe",
        corrected: "Wenn ich mehr Geld hätte",
        explanation: "Optional hypothetical phrasing.",
        confidence: 0.9,
      },
    ],
  });
  assert.deepEqual(
    parsed.grammarObservations.map((item) => item.signal),
    ["ERROR", "SUCCESS", "OPPORTUNITY"],
  );
});

test("optional grammar opportunities do not affect the deterministic overall score", () => {
  const base = baseEvaluation();
  const overall = calculateWritingOverall(base);
  const withOpportunity = calculateWritingOverall({
    ...base,
    grammarObservations: [
      {
        grammarConceptId: "de.subjunctive.konjunktiv-ii-hypothetical",
        signal: "OPPORTUNITY",
        original: "Wenn ich Zeit habe",
        corrected: "Wenn ich Zeit hätte",
        explanation: "Optional.",
        confidence: 0.9,
      },
    ],
  });
  assert.equal(withOpportunity, overall);
});
