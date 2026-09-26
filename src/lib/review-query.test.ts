import assert from "node:assert/strict";
import test from "node:test";
import {
  optimisticReviewAdvance,
  REVIEW_QUEUE_QUERY_POLICY,
  shouldRefillReviewQueue,
} from "./review-query";
import type { ReviewQueueData } from "./review-queue";

const queue: ReviewQueueData = {
  dueCount: 8,
  cards: [
    {
      userVocabularyId: "uv-1",
      lexemeId: "lex-1",
      lemma: "Haus",
      article: "das",
      review: {
        family: "GERMAN_MEANING",
        exerciseType: "MEANING_RECALL",
        front: { prompt: "Haus" },
        back: { answer: "house", details: [] },
      },
    },
    {
      userVocabularyId: "uv-2",
      lexemeId: "lex-2",
      lemma: "gehen",
      article: null,
      review: {
        family: "GERMAN_MEANING",
        exerciseType: "MEANING_RECALL",
        front: { prompt: "gehen" },
        back: { answer: "go", details: [] },
      },
    },
  ],
};

test("optimistic review advance removes only the rated card", () => {
  const next = optimisticReviewAdvance(queue, "uv-1");
  assert.equal(next.dueCount, 7);
  assert.deepEqual(
    next.cards.map((card) => card.userVocabularyId),
    ["uv-2"],
  );
});

test("overlapping reviews advance once per card and retries do not change the count", () => {
  const first = optimisticReviewAdvance(queue, "uv-1");
  const second = optimisticReviewAdvance(first, "uv-2");
  const retry = optimisticReviewAdvance(second, "uv-1");

  assert.equal(first.dueCount, 7);
  assert.equal(second.dueCount, 6);
  assert.deepEqual(second.cards, []);
  assert.equal(retry, second);
});

test("hydrated review data does not refetch immediately on mount", () => {
  assert.equal(REVIEW_QUEUE_QUERY_POLICY.refetchOnMount, false);
  assert.equal(REVIEW_QUEUE_QUERY_POLICY.refetchOnWindowFocus, false);
  assert.ok(REVIEW_QUEUE_QUERY_POLICY.staleTime > 0);
});

test("review queue refills only when the buffer is low and more are due", () => {
  assert.equal(
    shouldRefillReviewQueue({ ...queue, dueCount: 8, cards: queue.cards }),
    true,
  );
  assert.equal(
    shouldRefillReviewQueue({ ...queue, dueCount: 2, cards: queue.cards }),
    false,
  );
});
