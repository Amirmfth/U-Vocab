import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import {
  updateConversationTargetsBatch,
  updateVocabularyMasteryBatch,
} from "./vocabulary-batch";

function rawExecutor() {
  let calls = 0;
  const db = {
    $executeRaw: async () => {
      calls += 1;
      return 1;
    },
  } as unknown as Pick<PrismaClient, "$executeRaw">;

  return { db, calls: () => calls };
}

test("updateVocabularyMasteryBatch skips an empty batch", async () => {
  const mock = rawExecutor();
  const result = await updateVocabularyMasteryBatch(mock.db, []);

  assert.equal(result, 0);
  assert.equal(mock.calls(), 0);
});

test("updateVocabularyMasteryBatch executes one set-based statement", async () => {
  const mock = rawExecutor();

  await updateVocabularyMasteryBatch(mock.db, [
    { id: "uv-1", production: 0.6, contextualUsage: 0.7 },
    { id: "uv-2", production: 0.8, contextualUsage: 0.9 },
  ]);

  assert.equal(mock.calls(), 1);
});

test("updateConversationTargetsBatch executes one statement for multiple targets", async () => {
  const mock = rawExecutor();

  await updateConversationTargetsBatch(mock.db, [
    { id: "target-1", successful: true, lastUsedAt: new Date(0) },
    { id: "target-2", successful: false, lastUsedAt: new Date(0) },
  ]);

  assert.equal(mock.calls(), 1);
});
