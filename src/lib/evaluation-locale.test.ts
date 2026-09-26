import assert from "node:assert/strict";
import test from "node:test";
import { evaluationLocaleForPreference } from "./evaluation-locale";

test("Persian preference produces Persian evaluation feedback", () => {
  assert.equal(evaluationLocaleForPreference("PERSIAN"), "fa");
});

test("English and Both use English evaluation feedback", () => {
  assert.equal(evaluationLocaleForPreference("ENGLISH"), "en");
  assert.equal(evaluationLocaleForPreference("BOTH"), "en");
});
