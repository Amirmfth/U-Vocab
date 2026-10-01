import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  PRODUCT_EVENT_NAMES,
  validateProductEventProperties,
} from "./events";
import { analyticsAllowed } from "@/lib/observability/config";

test("product event schemas reject raw learner-content property names", () => {
  for (const key of [
    "draft",
    "content",
    "message",
    "prompt",
    "response",
    "answer",
    "notes",
    "email",
    "token",
  ]) {
    assert.equal(validateProductEventProperties({ [key]: "private text" }), false);
  }
});

test("product event properties accept only bounded primitive metadata", () => {
  assert.equal(
    validateProductEventProperties({
      level: "B2",
      targetCount: 4,
      success: true,
      score: 0.82,
      optional: null,
    }),
    true,
  );
  assert.equal(validateProductEventProperties({ nested: { text: "x" } }), false);
  assert.equal(validateProductEventProperties({ value: "x".repeat(161) }), false);
});

test("event taxonomy includes acquisition, learning, practice and monetization events", () => {
  for (const event of [
    "signup_completed",
    "onboarding_started",
    "vocabulary_added",
    "review_answered",
    "grammar_lesson_opened",
    "writing_completed",
    "reading_completed",
    "conversation_completed",
    "quota_exhausted",
    "subscription_activated",
  ] as const) {
    assert.equal(PRODUCT_EVENT_NAMES.has(event), true);
  }
});

test("analytics is disabled in test/dev unless explicitly production-configured", () => {
  assert.equal(analyticsAllowed(), false);
});

test("logout resets observability identity before redirect", () => {
  const source = fs.readFileSync("src/app/settings/SignOutButton.tsx", "utf8");
  const resetIndex = source.indexOf("resetObservabilityIdentity()");
  const signOutIndex = source.indexOf("authClient.signOut()");
  assert.ok(resetIndex >= 0);
  assert.ok(signOutIndex > resetIndex);
});
