import assert from "node:assert/strict";
import test from "node:test";
import { scheduleReview } from "./fsrs";
import { buildActivityDays, localDateKey, percentChange, progressRangeWindow, recentFailedRetrievals, rescueRisk, resolveProgressRange } from "./progress";

test("successful retrieval clears earlier rescue failures", () => {
  const failures = recentFailedRetrievals([
    { userVocabularyId: "word", correct: false },
    { userVocabularyId: "word", correct: true },
  ]);
  assert.equal(failures.get("word"), 0);

  const now = new Date("2026-09-27T00:00:00Z");
  const scheduled = scheduleReview(null, "GOOD", now);
  const risk = rescueRisk({
    fsrsCard: scheduled.nextCard,
    nextReviewAt: scheduled.due,
    stability: scheduled.stability,
    recentFailures: failures.get("word") ?? 0,
    now,
  });
  assert.ok(risk.score < 0.16);
  assert.ok(!risk.reasons.some((reason) => reason.includes("failed retrieval")));
});

test("localDateKey respects the learner timezone", () => {
  const instant = new Date("2026-09-24T21:30:00Z");
  assert.equal(localDateKey(instant, "Asia/Baku"), "2026-09-25");
  assert.equal(localDateKey(instant, "America/New_York"), "2026-09-24");
});

test("activity aggregation separates reading and production signals", () => {
  const days = buildActivityDays({
    timeZone: "UTC",
    attempts: [
      {
        createdAt: new Date("2026-09-24T10:00:00Z"),
        exerciseType: "FREE_SENTENCE",
        durationMs: 45000,
      },
    ],
    reviews: [{ reviewedAt: new Date("2026-09-24T10:05:00Z") }],
    encounters: [
      { createdAt: new Date("2026-09-24T11:00:00Z"), source: "reading" },
      { createdAt: new Date("2026-09-24T12:00:00Z"), source: "manual" },
    ],
    vocabulary: [{ addedAt: new Date("2026-09-24T09:00:00Z") }],
    mistakes: [{ resolvedAt: new Date("2026-09-24T10:10:00Z") }],
  });

  assert.equal(days.length, 1);
  assert.equal(days[0].reviewed, 1);
  assert.equal(days[0].learned, 1);
  assert.equal(days[0].produced, 1);
  assert.equal(days[0].readingEncounters, 1);
  assert.equal(days[0].mistakesCorrected, 1);
  assert.equal(days[0].durationMs, 45000);
});


test("free progress is pinned to the useful seven-day range", () => {
  assert.equal(resolveProgressRange("365", false), "7");
  assert.equal(resolveProgressRange("30", false), "7");
  assert.equal(resolveProgressRange(undefined, false), "7");
});

test("pro progress accepts bounded historical ranges", () => {
  assert.equal(resolveProgressRange("7", true), "7");
  assert.equal(resolveProgressRange("90", true), "90");
  assert.equal(resolveProgressRange("365", true), "365");
  assert.equal(resolveProgressRange("all", true), "30");
});

test("progress comparison windows are adjacent and bounded", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const window = progressRangeWindow("30", now);
  assert.equal(window.days, 30);
  assert.equal(window.currentStart.toISOString(), "2026-09-05T12:00:00.000Z");
  assert.equal(window.previousEnd.toISOString(), "2026-09-05T12:00:00.000Z");
  assert.equal(window.previousStart.toISOString(), "2026-08-06T12:00:00.000Z");
});

test("percent change avoids invented infinity when the prior period is zero", () => {
  assert.equal(percentChange(0, 0), 0);
  assert.equal(percentChange(5, 0), null);
  assert.equal(percentChange(15, 10), 0.5);
});
