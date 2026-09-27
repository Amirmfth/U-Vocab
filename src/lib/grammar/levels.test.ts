import assert from "node:assert/strict";
import test from "node:test";
import type { CefrLevel } from "@prisma/client";
import {
  isConceptAssumedForLevel,
  isValidCefrLevel,
  targetLevelIsValid,
} from "./levels";

test("validates CEFR levels and current-to-target direction", () => {
  assert.equal(isValidCefrLevel("B1"), true);
  assert.equal(isValidCefrLevel("B3"), false);
  assert.equal(targetLevelIsValid("B1", "B2"), true);
  assert.equal(targetLevelIsValid("B1", "B1"), true);
  assert.equal(targetLevelIsValid("B2", "B1"), false);
});

test("B1 assumes earlier expected knowledge but not B1 concepts", () => {
  assert.equal(isConceptAssumedForLevel("B1", "A1", "A1"), true);
  assert.equal(isConceptAssumedForLevel("B1", "A2", "A2"), true);
  assert.equal(isConceptAssumedForLevel("B1", "A2", "B1"), false);
  assert.equal(isConceptAssumedForLevel("B1", "B1", "B1"), false);
});

test("new A1 learners do not receive assumed grammar by default", () => {
  const levels: Array<[CefrLevel, CefrLevel | null]> = [
    ["A1", "A1"],
    ["A1", "A2"],
  ];
  for (const [introducedAt, expectedBy] of levels) {
    assert.equal(isConceptAssumedForLevel("A1", introducedAt, expectedBy), false);
  }
});
