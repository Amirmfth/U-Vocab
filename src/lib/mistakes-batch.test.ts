import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { recordMistakesBatch } from "./mistakes-batch";

function mockDb(options?: {
  existing?: Array<{ id: string; lexemeId: string; type: "ARTICLE" }>;
}) {
  const created: Array<Record<string, unknown>> = [];
  const updated: Array<Record<string, unknown>> = [];

  const db = {
    mistake: {
      findMany: async () => options?.existing ?? [],
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
        created.push(...data);
        return { count: data.length };
      },
      update: async (args: Record<string, unknown>) => {
        updated.push(args);
        return args;
      },
    },
    $transaction: async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
  } as unknown as PrismaClient;

  return { db, created, updated };
}

test("recordMistakesBatch groups duplicate mistake keys and preserves occurrence count", async () => {
  const { db, created } = mockDb();

  await recordMistakesBatch(db, {
    userId: "user-1",
    mistakes: [
      {
        lexemeId: "lexeme-1",
        type: "ARTICLE",
        expected: "der",
        actual: "die",
        explanation: "Wrong article",
      },
      {
        lexemeId: "lexeme-1",
        type: "ARTICLE",
        expected: "der",
        actual: "das",
        explanation: "Wrong article again",
      },
    ],
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].occurrences, 2);
  assert.equal(created[0].actual, "das");
});

test("recordMistakesBatch increments an existing unresolved mistake by the grouped count", async () => {
  const { db, updated } = mockDb({
    existing: [{ id: "mistake-1", lexemeId: "lexeme-1", type: "ARTICLE" }],
  });

  await recordMistakesBatch(db, {
    userId: "user-1",
    mistakes: [
      {
        lexemeId: "lexeme-1",
        type: "ARTICLE",
        expected: "der",
        actual: "die",
        explanation: "Wrong article",
      },
      {
        lexemeId: "lexeme-1",
        type: "ARTICLE",
        expected: "der",
        actual: "das",
        explanation: "Wrong article again",
      },
    ],
  });

  assert.equal(updated.length, 1);
  const data = updated[0].data as {
    occurrences: { increment: number };
  };
  assert.equal(data.occurrences.increment, 2);
});
