import assert from "node:assert/strict";
import test from "node:test";
import { containsReadingTarget, READING_TARGETS_PER_LENGTH } from "./targets";

test("reading lengths require five, ten, and fifteen distinct target words", () => {
  assert.deepEqual(READING_TARGETS_PER_LENGTH, { SHORT: 5, MEDIUM: 10, LONG: 15 });
});

test("target validation matches complete German words and phrases", () => {
  assert.equal(containsReadingTarget("Ich habe ein Haus. Das Haus ist alt.", "Haus"), true);
  assert.equal(containsReadingTarget("Die Häuser sind alt.", "Haus"), false);
  assert.equal(containsReadingTarget("Wir stehen auf. Morgen stehen wir auf.", "stehen auf"), true);
  assert.equal(containsReadingTarget("Das ist eine Haushaltsfrage.", "Haus"), false);
});
