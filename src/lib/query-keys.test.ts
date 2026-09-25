import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQueryFilters, queryKeys } from "./query-keys";

test("query filters normalize ordering and omit empty/all values", () => {
  assert.deepEqual(
    normalizeQueryFilters({
      topic: "Travel",
      q: "Haus",
      status: "ALL",
      level: "",
    }),
    {
      q: "Haus",
      topic: "Travel",
    },
  );
});

test("equivalent vocabulary filters produce deterministic query keys", () => {
  assert.deepEqual(
    queryKeys.vocabulary.list("user-a", {
      topic: "Travel",
      status: "WEAK",
    }),
    queryKeys.vocabulary.list("user-a", {
      status: "WEAK",
      topic: "Travel",
    }),
  );
});

test("query domains stay hierarchical", () => {
  assert.deepEqual(queryKeys.review.queue("user-a"), ["review", "user-a", "queue"]);
  assert.deepEqual(queryKeys.word.detail("lexeme-1"), ["word", "lexeme-1"]);
  assert.deepEqual(queryKeys.writing.session("session-1"), [
    "writing",
    "session-1",
  ]);
});
