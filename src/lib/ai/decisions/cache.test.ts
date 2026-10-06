import assert from "node:assert/strict";
import test from "node:test";
import { decisionFingerprint } from "./cache";

test("decision cache fingerprint invalidates on learner or candidate changes", () => {
  const baseline = decisionFingerprint({ candidateIds: ["a", "b"], weak: ["production"] });
  assert.equal(baseline, decisionFingerprint({ candidateIds: ["a", "b"], weak: ["production"] }));
  assert.notEqual(baseline, decisionFingerprint({ candidateIds: ["a", "c"], weak: ["production"] }));
  assert.notEqual(baseline, decisionFingerprint({ candidateIds: ["a", "b"], weak: ["context"] }));
});
