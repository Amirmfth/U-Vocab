import assert from "node:assert/strict";
import test from "node:test";
import { scheduleReview } from "./fsrs";

test("a successful first review creates future FSRS state", () => {
  const now = new Date("2026-09-24T10:00:00.000Z");
  const result = scheduleReview(null, "GOOD", now);

  assert.ok(result.due.getTime() > now.getTime());
  assert.ok(result.stability > 0);
  assert.ok(result.difficulty > 0);
});

test("Again schedules earlier than Easy from a new card", () => {
  const now = new Date("2026-09-24T10:00:00.000Z");
  const again = scheduleReview(null, "AGAIN", now);
  const easy = scheduleReview(null, "EASY", now);

  assert.ok(again.due.getTime() <= easy.due.getTime());
});
