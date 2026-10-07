import assert from "node:assert/strict";
import test from "node:test";
import {
  READING_DECISION_CANDIDATE_LIMIT,
  READING_ENRICHMENT_LIMIT,
} from "./reading-filter";

test("reading Decisions prefilter keeps bounded input and enrichment sizes", () => {
  assert.ok(READING_DECISION_CANDIDATE_LIMIT <= 30);
  assert.ok(READING_ENRICHMENT_LIMIT >= 8);
  assert.ok(READING_ENRICHMENT_LIMIT <= 12);
  assert.ok(READING_ENRICHMENT_LIMIT < READING_DECISION_CANDIDATE_LIMIT);
});
