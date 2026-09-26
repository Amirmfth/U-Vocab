import assert from "node:assert/strict";
import test from "node:test";
import { formatRelativeReviewTime } from "./relative-time";

const now = new Date("2026-09-26T12:00:00.000Z");

test("formats due and near-term review times", () => {
  assert.equal(formatRelativeReviewTime(now, now), "due now");
  assert.equal(
    formatRelativeReviewTime(new Date("2026-09-26T12:18:00.000Z"), now),
    "in 18 min",
  );
  assert.equal(
    formatRelativeReviewTime(new Date("2026-09-26T16:00:00.000Z"), now),
    "in 4 hours",
  );
});

test("formats multi-day review times", () => {
  assert.equal(
    formatRelativeReviewTime(new Date("2026-10-02T12:00:00.000Z"), now),
    "in 6 days",
  );
});
