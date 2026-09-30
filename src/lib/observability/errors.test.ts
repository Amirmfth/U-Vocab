import assert from "node:assert/strict";
import test from "node:test";
import { QuotaExceededError } from "@/lib/entitlements/errors";
import { UnauthorizedError } from "@/lib/auth";
import { isExpectedOperationalError } from "./errors";

test("expected domain outcomes are excluded from fatal Sentry reporting", () => {
  assert.equal(
    isExpectedOperationalError(
      new QuotaExceededError(
        "vocabulary_addition_daily",
        5,
        5,
        new Date("2026-10-01T00:00:00Z"),
      ),
    ),
    true,
  );
  assert.equal(isExpectedOperationalError(new UnauthorizedError()), true);

  const validation = new Error("Invalid review submission.");
  assert.equal(isExpectedOperationalError(validation), true);
});

test("unexpected infrastructure errors remain reportable", () => {
  assert.equal(
    isExpectedOperationalError(new Error("database connection terminated")),
    false,
  );
});
