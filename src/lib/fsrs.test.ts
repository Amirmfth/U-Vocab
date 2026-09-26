import assert from "node:assert/strict";
import test from "node:test";
import { isReviewDue, scheduleReview } from "./fsrs";

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
  assert.ok(easy.due.getTime() - now.getTime() >= 24 * 60 * 60 * 1000);
});


test("Hard, Good, and Easy progressively defer the next review", () => {
  const now = new Date("2026-09-24T10:00:00.000Z");
  const hard = scheduleReview(null, "HARD", now);
  const good = scheduleReview(null, "GOOD", now);
  const easy = scheduleReview(null, "EASY", now);

  assert.ok(hard.due.getTime() <= good.due.getTime());
  assert.ok(good.due.getTime() <= easy.due.getTime());
  assert.ok(easy.due.getTime() > now.getTime());
});

test("review due status follows the persisted FSRS due time", () => {
  const now = new Date("2026-09-24T10:00:00.000Z");

  assert.equal(isReviewDue(null, now), true);
  assert.equal(
    isReviewDue(new Date("2026-09-24T09:59:59.000Z"), now),
    true,
  );
  assert.equal(
    isReviewDue(new Date("2026-09-24T10:00:01.000Z"), now),
    false,
  );
});
