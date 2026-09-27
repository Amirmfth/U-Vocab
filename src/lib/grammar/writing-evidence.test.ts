import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptedWritingGrammarObservations,
  grammarMistakeTypeForCategory,
  parentErrorConceptIds,
  writingObservationStrength,
} from "./writing-evidence";

test("writing grammar observations reject unknown and low-confidence IDs", () => {
  const observations = [
    {
      grammarConceptId: "de.case.dative",
      signal: "ERROR" as const,
      original: "mit mein Bruder",
      corrected: "mit meinem Bruder",
      explanation: "Dative required",
      confidence: 0.95,
    },
    {
      grammarConceptId: "de.fake",
      signal: "SUCCESS" as const,
      original: "x",
      corrected: null,
      explanation: "x",
      confidence: 0.99,
    },
    {
      grammarConceptId: "de.case.dative",
      signal: "SUCCESS" as const,
      original: "mit meinem Bruder",
      corrected: null,
      explanation: "x",
      confidence: 0.6,
    },
  ];
  const accepted = acceptedWritingGrammarObservations(
    observations,
    new Set(["de.case.dative"]),
  );
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].signal, "ERROR");
});

test("rewrite success receives stronger but bounded evidence", () => {
  const observation = {
    grammarConceptId: "de.case.dative",
    signal: "SUCCESS" as const,
    original: "mit meinem Bruder",
    corrected: null,
    explanation: "Correct dative",
    confidence: 0.95,
  };
  assert.ok(
    writingObservationStrength(observation, true) >
      writingObservationStrength(observation, false),
  );
});

test("parent error concepts are detected without treating opportunities as errors", () => {
  const ids = parentErrorConceptIds({
    grammarObservations: [
      {
        grammarConceptId: "de.case.dative",
        signal: "ERROR",
        original: "x",
        corrected: "y",
        explanation: "x",
        confidence: 0.95,
      },
      {
        grammarConceptId: "de.subjunctive.konjunktiv-ii-hypothetical",
        signal: "OPPORTUNITY",
        original: "x",
        corrected: "y",
        explanation: "x",
        confidence: 0.95,
      },
    ],
  });
  assert.deepEqual([...ids], ["de.case.dative"]);
});

test("grammar category maps deterministically to mistake taxonomy", () => {
  assert.equal(grammarMistakeTypeForCategory("CASES"), "CASE");
  assert.equal(grammarMistakeTypeForCategory("ADJECTIVES"), "ADJECTIVE_ENDING");
  assert.equal(grammarMistakeTypeForCategory("SUBJUNCTIVE"), "SUBJUNCTIVE");
});
