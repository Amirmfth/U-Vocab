import assert from "node:assert/strict";
import test from "node:test";
import {
  ONBOARDING_FIRST_ACTION,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_VERSION,
  normalizedOnboardingStep,
  onboardingComplete,
} from "./onboarding";
import { ENABLED_TARGET_LANGUAGES } from "./languages";
import { FIRST_USE_GUIDES, guideStateShouldShow } from "./first-use-guidance";
import { targetLevelIsValid } from "./grammar/levels";

test("new accounts are incomplete while migrated current-version accounts bypass onboarding", () => {
  assert.equal(
    onboardingComplete({ onboardingCompletedAt: null, onboardingVersion: 0 }),
    false,
  );
  assert.equal(
    onboardingComplete({
      onboardingCompletedAt: new Date("2026-09-30T00:00:00Z"),
      onboardingVersion: ONBOARDING_VERSION,
    }),
    true,
  );
});

test("onboarding is resumable within the seven stable steps", () => {
  assert.equal(ONBOARDING_STEP_COUNT, 7);
  assert.equal(normalizedOnboardingStep(0), 1);
  assert.equal(normalizedOnboardingStep(4), 4);
  assert.equal(normalizedOnboardingStep(99), 7);
  assert.equal(ONBOARDING_FIRST_ACTION, "/vocabulary/new");
});

test("only enabled target languages are offered and German is currently the sole course", () => {
  assert.deepEqual([...ENABLED_TARGET_LANGUAGES], ["GERMAN"]);
});

test("target CEFR cannot be below current level", () => {
  assert.equal(targetLevelIsValid("B2", "B1"), false);
  assert.equal(targetLevelIsValid("B2", "B2"), true);
  assert.equal(targetLevelIsValid("B2", "C1"), true);
});

test("first-use guide dismissal persists for a version and resurfaces on a newer version", () => {
  const dismissed = {
    version: 1,
    dismissedAt: new Date("2026-09-30T00:00:00Z"),
  };
  assert.equal(guideStateShouldShow(null, 1), true);
  assert.equal(guideStateShouldShow({ version: 1, dismissedAt: null }, 1), true);
  assert.equal(guideStateShouldShow(dismissed, 1), false);
  assert.equal(guideStateShouldShow(dismissed, 2), true);
});

test("required contextual guides use stable unique IDs", () => {
  const ids = Object.values(FIRST_USE_GUIDES).map((guide) => guide.id);
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(Object.keys(FIRST_USE_GUIDES), [
    "review",
    "grammar",
    "practice",
    "conversation",
    "progress",
  ]);
});
