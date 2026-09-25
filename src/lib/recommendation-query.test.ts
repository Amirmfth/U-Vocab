import assert from "node:assert/strict";
import test from "node:test";
import type { VocabularyRecommendation } from "./recommendations";
import { optimisticRemoveRecommendation } from "./recommendation-query";

const recommendations: VocabularyRecommendation[] = [
  {
    lexemeId: "lex-1",
    lemma: "erreichen",
    article: null,
    partOfSpeech: "VERB",
    english: "reach",
    persian: null,
    score: 0.8,
    similarity: 0.7,
    reasons: [{ label: "connected", weight: 0.2 }],
  },
  {
    lexemeId: "lex-2",
    lemma: "Fortschritt",
    article: "der",
    partOfSpeech: "NOUN",
    english: "progress",
    persian: null,
    score: 0.7,
    similarity: 0.5,
    reasons: [{ label: "topic", weight: 0.15 }],
  },
];

test("recommendation optimistic removal preserves the remaining order", () => {
  const next = optimisticRemoveRecommendation(recommendations, "lex-1");
  assert.deepEqual(next.map((item) => item.lexemeId), ["lex-2"]);
});

test("recommendation rollback can restore the previous snapshot", () => {
  const previous = structuredClone(recommendations);
  const optimistic = optimisticRemoveRecommendation(previous, "lex-1");

  assert.equal(optimistic.length, 1);
  assert.deepEqual(previous, recommendations);
});
