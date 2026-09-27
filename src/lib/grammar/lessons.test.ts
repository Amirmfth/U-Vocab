import assert from "node:assert/strict";
import test from "node:test";
import { grammarLessonNeedsRefresh } from "./lessons";

test("grammar lesson backfill skips current lessons and refreshes missing/stale lessons", () => {
  assert.equal(
    grammarLessonNeedsRefresh({
      lesson: { sourceContentVersion: 3 },
      contentVersion: 3,
    }),
    false,
  );
  assert.equal(
    grammarLessonNeedsRefresh({
      lesson: { sourceContentVersion: 2 },
      contentVersion: 3,
    }),
    true,
  );
  assert.equal(
    grammarLessonNeedsRefresh({
      lesson: null,
      contentVersion: 3,
    }),
    true,
  );
});
