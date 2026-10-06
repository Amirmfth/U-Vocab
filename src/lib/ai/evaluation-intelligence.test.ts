import assert from "node:assert/strict";
import test from "node:test";
import {
  EVALUATOR_HIGH_CONFIDENCE,
  evidenceStrength,
  levenshteinDistance,
  localErrorSignal,
} from "./evaluation-intelligence";

test("near spelling slips are identified locally without model judgment", () => {
  assert.equal(levenshteinDistance("wahrscheinlich", "wahrscheinlih"), 1);
  assert.equal(localErrorSignal("wahrscheinlich", "wahrscheinlih").kind, "NEAR_TYPO");
});

test("semantic substitutions are not mislabeled as obvious typos", () => {
  assert.equal(localErrorSignal("wahrscheinlich", "vielleicht").kind, "DISTANT");
});

test("confidence buckets keep weak evaluator guesses from strong evidence", () => {
  assert.equal(evidenceStrength(EVALUATOR_HIGH_CONFIDENCE), "HIGH");
  assert.equal(evidenceStrength(0.7), "MEDIUM");
  assert.equal(evidenceStrength(0.3), "LOW");
});
