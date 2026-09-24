import assert from "node:assert/strict";
import test from "node:test";
import { buildActivityDays, localDateKey } from "./progress";

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
