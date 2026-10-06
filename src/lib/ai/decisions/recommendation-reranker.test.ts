import assert from "node:assert/strict";
import test from "node:test";
import { reconcileRecommendationRanking, RECOMMENDATION_RERANK_CANDIDATE_LIMIT } from "./recommendation-reranker";
import type { VocabularyRecommendation } from "@/lib/recommendations";

function candidate(id: string, score: number): VocabularyRecommendation {
  return {
    lexemeId: id,
    lemma: id,
    article: null,
    partOfSpeech: "VERB",
    cefrLevel: "B1",
    english: null,
    persian: null,
    score,
    similarity: 0,
    reasons: [],
    signals: {
      graphNeighbor: false,
      recentEncounter: false,
      levelMatch: true,
      weakAnchor: false,
    },
  };
}

test("recommendation reranking ignores unknown and duplicate IDs and appends omissions", () => {
  const candidates = [candidate("a", 0.9), candidate("b", 0.8), candidate("c", 0.7)];
  const ranked = reconcileRecommendationRanking(candidates, {
    ranked: [
      { candidateId: "b", relevanceScore: 0.99, reasonCode: "ACTIVE_USE_VALUE" },
      { candidateId: "unknown", relevanceScore: 1, reasonCode: "OTHER" },
      { candidateId: "b", relevanceScore: 0.2, reasonCode: "OTHER" },
    ],
  });
  assert.deepEqual(ranked.map((item) => item.lexemeId), ["b", "a", "c"]);
  assert.equal(ranked[0].aiReasonCode, "ACTIVE_USE_VALUE");
});

test("recommendation decision candidate cap stays bounded", () => {
  assert.ok(RECOMMENDATION_RERANK_CANDIDATE_LIMIT >= 15);
  assert.ok(RECOMMENDATION_RERANK_CANDIDATE_LIMIT <= 25);
});
