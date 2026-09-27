import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateGrammarProfile,
  evaluateGrammarEvidencePolicy,
} from "./learner-policy";

function evidence(
  outcome: "SUCCESS" | "ERROR",
  effectiveWeight: number,
  dimension:
    | "UNDERSTANDING"
    | "CONTROLLED_PRODUCTION"
    | "FREE_PRODUCTION" = "CONTROLLED_PRODUCTION",
) {
  return { outcome, effectiveWeight, dimension, accepted: true } as const;
}

test("low confidence AI-style evidence is retained but does not affect mastery", () => {
  const result = evaluateGrammarEvidencePolicy({
    source: "WRITING",
    outcome: "ERROR",
    dimension: "FREE_PRODUCTION",
    confidence: 0.4,
  });
  assert.equal(result.accepted, false);
  assert.equal(result.effectiveWeight, 0);
});

test("controlled production carries more evidence than recognition", () => {
  const understanding = evaluateGrammarEvidencePolicy({
    source: "PRACTICE",
    outcome: "SUCCESS",
    dimension: "UNDERSTANDING",
  });
  const production = evaluateGrammarEvidencePolicy({
    source: "PRACTICE",
    outcome: "SUCCESS",
    dimension: "CONTROLLED_PRODUCTION",
  });
  assert.ok(production.effectiveWeight > understanding.effectiveWeight);
});

test("repeated strong errors turn assumed grammar into needs attention", () => {
  const result = calculateGrammarProfile("ASSUMED", [
    evidence("ERROR", 0.9, "FREE_PRODUCTION"),
    evidence("ERROR", 0.9, "FREE_PRODUCTION"),
  ]);
  assert.equal(result.status, "NEEDS_ATTENTION");
  assert.equal(result.freeProduction, 0);
});

test("sufficient successful production becomes strong", () => {
  const result = calculateGrammarProfile("LEARNING", [
    evidence("SUCCESS", 0.6),
    evidence("SUCCESS", 0.6),
    evidence("SUCCESS", 0.6),
  ]);
  assert.equal(result.status, "STRONG");
});

test("one error cannot catastrophically downgrade strong grammar", () => {
  const result = calculateGrammarProfile("STRONG", [
    evidence("SUCCESS", 0.8),
    evidence("SUCCESS", 0.8),
    evidence("SUCCESS", 0.8),
    evidence("ERROR", 0.8),
  ]);
  assert.equal(result.status, "STRONG");
});
