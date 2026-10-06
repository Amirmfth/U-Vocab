import assert from "node:assert/strict";
import test from "node:test";
import {
  compareMetric,
  learningReport,
  previousPeriod,
  rangeCutoff,
  resolveProgressRange,
} from "./progress-analytics";

test("Free analytics are limited to the useful 7-day window", () => {
  assert.equal(resolveProgressRange(undefined, false), "7");
  assert.equal(resolveProgressRange("7", false), "7");
  assert.equal(resolveProgressRange("30", false), "7");
  assert.equal(resolveProgressRange("all", false), "7");
});

test("Pro analytics keep supported historical ranges", () => {
  assert.equal(resolveProgressRange(undefined, true), "30");
  assert.equal(resolveProgressRange("90", true), "90");
  assert.equal(resolveProgressRange("365", true), "365");
  assert.equal(resolveProgressRange("all", true), "all");
  assert.equal(resolveProgressRange("invalid", true), "30");
});

test("historical range and previous period use non-overlapping equal windows", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  assert.equal(rangeCutoff("30", now)?.toISOString(), "2026-09-05T12:00:00.000Z");
  const previous = previousPeriod("30", now);
  assert.equal(previous?.end.toISOString(), "2026-09-05T12:00:00.000Z");
  assert.equal(previous?.start.toISOString(), "2026-08-06T12:00:00.000Z");
  assert.equal(previousPeriod("all", now), null);
});

test("period comparison handles zero baselines without fake infinite growth", () => {
  assert.deepEqual(compareMetric(12, 8), {
    current: 12,
    previous: 8,
    delta: 4,
    relative: 0.5,
  });
  assert.equal(compareMetric(3, 0).relative, null);
});

test("learning report is deterministic and prioritizes observed weaknesses", () => {
  assert.deepEqual(
    learningReport({
      recognition: 0.82,
      production: 0.51,
      retention: 0.77,
      dueNow: 12,
      topWeakness: "CASE",
      masteredDelta: 4,
    }),
    {
      strongest: "recognition",
      highestImpactWeakness: "CASE",
      recentImprovement: "mastery",
      suggestedNext: "CASE",
    },
  );
});
