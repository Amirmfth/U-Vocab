import assert from "node:assert/strict";
import test from "node:test";
import { calculateGrammarProfile } from "./learner-policy";
import { rankGrammarRecommendation } from "./recommendations";

const evidence = (
  outcome: "SUCCESS" | "ERROR",
  effectiveWeight: number,
  dimension: "UNDERSTANDING" | "CONTROLLED_PRODUCTION" | "FREE_PRODUCTION",
) => ({ outcome, effectiveWeight, dimension, accepted: true } as const);

test("B1→B2 assumption correction and recovery remains evidence-driven", () => {
  const afterWritingErrors = calculateGrammarProfile("ASSUMED", [
    evidence("ERROR", 0.9, "FREE_PRODUCTION"),
    evidence("ERROR", 0.9, "FREE_PRODUCTION"),
  ]);
  assert.equal(afterWritingErrors.status, "NEEDS_ATTENTION");

  const recommendation = rankGrammarRecommendation(
    [{
      id: "de.case.dative",
      slug: "dative",
      title: "Dative case",
      introducedAt: "A2",
      status: afterWritingErrors.status,
      unresolvedMistakes: 2,
      recentEvidenceAt: new Date("2026-09-27T12:00:00Z"),
      recentEvidenceCount: 2,
      relatedVocabularyCount: 4,
      prerequisiteIds: [],
    }],
    new Map([["de.case.dative", afterWritingErrors.status]]),
    "B1",
    "B2",
  );
  assert.equal(recommendation?.reasonCode, "WEAKNESS");

  const afterOnePracticeSuccess = calculateGrammarProfile("NEEDS_ATTENTION", [
    evidence("ERROR", 0.9, "FREE_PRODUCTION"),
    evidence("ERROR", 0.9, "FREE_PRODUCTION"),
    evidence("SUCCESS", 0.55, "CONTROLLED_PRODUCTION"),
  ]);
  assert.notEqual(afterOnePracticeSuccess.status, "STRONG");

  const recovered = calculateGrammarProfile("NEEDS_ATTENTION", [
    evidence("SUCCESS", 0.6, "CONTROLLED_PRODUCTION"),
    evidence("SUCCESS", 0.6, "CONTROLLED_PRODUCTION"),
    evidence("SUCCESS", 0.6, "FREE_PRODUCTION"),
  ]);
  assert.equal(recovered.status, "STRONG");
});
