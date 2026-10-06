import { z } from "zod";
import type { VocabularyRecommendation } from "@/lib/recommendations";
import { aiRoute } from "../routing";
import { getDecisionCache, putDecisionCache } from "./cache";
import { runStructuredDecision } from "./run-decision";

export const RECOMMENDATION_RERANK_CANDIDATE_LIMIT = 20;
const CACHE_TTL_SECONDS = 6 * 60 * 60;

export const recommendationReasonCodeSchema = z.enum([
  "RECENT_CONTEXT",
  "WEAK_AREA",
  "LEXICAL_CONNECTION",
  "LEVEL_FIT",
  "ACTIVE_USE_VALUE",
  "OTHER",
]);

export const recommendationRerankSchema = z.object({
  ranked: z.array(
    z.object({
      candidateId: z.string(),
      relevanceScore: z.number().min(0).max(1),
      reasonCode: recommendationReasonCodeSchema,
    }),
  ).max(RECOMMENDATION_RERANK_CANDIDATE_LIMIT),
});

export type RecommendationRerankDecision = z.infer<typeof recommendationRerankSchema>;

export function reconcileRecommendationRanking(
  candidates: VocabularyRecommendation[],
  decision: RecommendationRerankDecision,
) {
  const byId = new Map(candidates.map((candidate) => [candidate.lexemeId, candidate]));
  const seen = new Set<string>();
  const ranked: Array<VocabularyRecommendation & {
    aiRelevanceScore?: number;
    aiReasonCode?: string;
  }> = [];

  for (const item of decision.ranked) {
    if (seen.has(item.candidateId)) continue;
    const candidate = byId.get(item.candidateId);
    if (!candidate) continue;
    seen.add(item.candidateId);
    ranked.push({
      ...candidate,
      aiRelevanceScore: Math.max(0, Math.min(1, item.relevanceScore)),
      aiReasonCode: item.reasonCode,
    });
  }

  for (const candidate of candidates) {
    if (!seen.has(candidate.lexemeId)) ranked.push(candidate);
  }
  return ranked;
}

export async function rerankVocabularyRecommendations(input: {
  userId: string;
  userCourseId: string;
  currentLevel: string;
  targetLevel: string;
  weakDimensions: string[];
  recurringMistakeTypes: string[];
  recentTopics: string[];
  candidates: VocabularyRecommendation[];
}) {
  const candidates = input.candidates.slice(0, RECOMMENDATION_RERANK_CANDIDATE_LIMIT);
  if (!candidates.length || process.env.AI_RECOMMENDATION_RERANK_ENABLED !== "true") {
    return { recommendations: input.candidates, usedAI: false, fallback: false };
  }

  const route = aiRoute("recommendation_rerank");
  const payload = {
    learner: {
      currentLevel: input.currentLevel,
      targetLevel: input.targetLevel,
      weakDimensions: input.weakDimensions.slice(0, 4),
      recurringMistakeTypes: input.recurringMistakeTypes.slice(0, 5),
      recentTopics: input.recentTopics.slice(0, 5),
    },
    candidates: candidates.map((candidate, index) => ({
      id: candidate.lexemeId,
      lemma: candidate.lemma,
      partOfSpeech: candidate.partOfSpeech,
      cefrLevel: candidate.cefrLevel,
      deterministicRank: index + 1,
      deterministicScore: candidate.score,
      semanticSimilarity: candidate.similarity,
      graphNeighbor: candidate.signals.graphNeighbor,
      recentEncounter: candidate.signals.recentEncounter,
      reinforcesWeakArea: candidate.signals.weakAnchor,
      levelMatch: candidate.signals.levelMatch,
    })),
  };

  const cached = await getDecisionCache<RecommendationRerankDecision>({
    userCourseId: input.userCourseId,
    operation: "recommendation_rerank",
    model: route.model,
    dimensions: {
      candidateIds: candidates.map((candidate) => candidate.lexemeId),
    },
    source: payload,
  });
  if (cached) {
    return {
      recommendations: [
        ...reconcileRecommendationRanking(candidates, cached),
        ...input.candidates.slice(candidates.length),
      ],
      usedAI: true,
      fallback: false,
      cached: true,
    };
  }

  const result = await runStructuredDecision({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "recommendation_rerank",
    schema: recommendationRerankSchema,
    schemaName: "recommendation_rerank",
    system:
      "Rerank only the supplied vocabulary candidates for pedagogical usefulness now. Prefer level fit, active-use value, recent context, lexical connections, and reinforcement of weak production/context areas. Keep decisions conservative and compact.",
    payload,
    metadata: {
      candidateCount: candidates.length,
      deterministicTopId: candidates[0]?.lexemeId ?? null,
    },
  });

  if (result.status !== "ok") {
    return { recommendations: input.candidates, usedAI: false, fallback: true };
  }

  await putDecisionCache({
    userCourseId: input.userCourseId,
    operation: "recommendation_rerank",
    model: result.model,
    dimensions: { candidateIds: candidates.map((candidate) => candidate.lexemeId) },
    source: payload,
    payload: result.data,
    ttlSeconds: CACHE_TTL_SECONDS,
  });

  return {
    recommendations: [
      ...reconcileRecommendationRanking(candidates, result.data),
      ...input.candidates.slice(candidates.length),
    ],
    usedAI: true,
    fallback: false,
    cached: false,
  };
}
