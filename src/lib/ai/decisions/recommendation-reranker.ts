import { z } from "zod";
import type { VocabularyRecommendation } from "@/lib/recommendations";
import { aiRoute } from "../routing";
import { getDecisionCache, putDecisionCache } from "./cache";
import { runStructuredDecision } from "./run-decision";
import {
  FIVE_LEVEL_SCORE,
  choiceAnswer,
  normalizedScore,
  runNativeDecision,
  scoreAnswer,
  type DecisionQuestion,
  type DecisionAnswerMap,
} from "./native";
import {
  decisionRolloutMode,
  shouldRunNativeDecision,
  shouldUseNativeDecision,
} from "./mode";

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

function nativeQuestions(candidates: VocabularyRecommendation[]): DecisionQuestion[] {
  const reasons = recommendationReasonCodeSchema.options.map((value) => ({
    value,
    description: value.replaceAll("_", " ").toLowerCase(),
  }));
  return candidates.flatMap((candidate) => [
    {
      type: "score" as const,
      name: "relevance:" + candidate.lexemeId,
      instructions:
        "How pedagogically useful is candidate " + candidate.lexemeId +
        " for this learner now? Judge level fit, active-use value, recent context, lexical connections, and reinforcement of weak production/context areas.",
      levels: [...FIVE_LEVEL_SCORE],
    },
    {
      type: "choice" as const,
      name: "reason:" + candidate.lexemeId,
      instructions:
        "What is the strongest pedagogical reason for prioritizing candidate " +
        candidate.lexemeId + " now?",
      choices: reasons,
    },
  ]);
}

function nativeRecommendationDecision(
  candidates: VocabularyRecommendation[],
  answers: DecisionAnswerMap,
): RecommendationRerankDecision {
  return {
    ranked: candidates
      .map((candidate) => {
        const relevance = normalizedScore(
          scoreAnswer(answers, "relevance:" + candidate.lexemeId),
        );
        const reason = choiceAnswer(answers, "reason:" + candidate.lexemeId);
        if (relevance === null || !reason || typeof reason.choice !== "string") {
          return null;
        }
        const parsedReason = recommendationReasonCodeSchema.safeParse(reason.choice);
        return {
          candidateId: candidate.lexemeId,
          relevanceScore: relevance,
          reasonCode: parsedReason.success ? parsedReason.data : ("OTHER" as const),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.relevanceScore - a.relevanceScore),
  };
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
  const legacyEnabled = process.env.AI_RECOMMENDATION_RERANK_ENABLED === "true";
  const mode = decisionRolloutMode(
    "OPENAI_DECISIONS_RECOMMENDATIONS_MODE",
    legacyEnabled,
  );
  if (!candidates.length || (!legacyEnabled && mode === "off")) {
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

  const dimensions = {
    candidateIds: candidates.map((candidate) => candidate.lexemeId),
    mode: shouldUseNativeDecision(mode) ? "decisions" : "responses",
  };

  const cached = await getDecisionCache<RecommendationRerankDecision>({
    userCourseId: input.userCourseId,
    operation: "recommendation_rerank",
    model: shouldUseNativeDecision(mode) ? "gpt-6-luna" : route.model,
    dimensions,
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

  const nativePromise = shouldRunNativeDecision(mode)
    ? runNativeDecision({
        userId: input.userId,
        userCourseId: input.userCourseId,
        operation: "recommendation_rerank",
        evidence: payload,
        questions: nativeQuestions(candidates),
        metadata: { shadow: mode === "shadow", candidateCount: candidates.length },
      })
    : Promise.resolve(null);

  const legacyPromise =
    mode === "on"
      ? Promise.resolve(null)
      : runStructuredDecision({
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

  const [nativeResult, legacyResult] = await Promise.all([nativePromise, legacyPromise]);

  let decision: RecommendationRerankDecision | null = null;
  let model = route.model;
  let fallback = false;

  if (shouldUseNativeDecision(mode) && nativeResult?.status === "ok") {
    decision = nativeRecommendationDecision(candidates, nativeResult.answers);
    model = nativeResult.response.model;
  } else if (legacyResult?.status === "ok") {
    decision = legacyResult.data;
    model = legacyResult.model;
    fallback = shouldUseNativeDecision(mode);
  } else if (shouldUseNativeDecision(mode)) {
    const fallbackResult = await runStructuredDecision({
      userId: input.userId,
      userCourseId: input.userCourseId,
      operation: "recommendation_rerank",
      schema: recommendationRerankSchema,
      schemaName: "recommendation_rerank",
      system:
        "Rerank only the supplied vocabulary candidates for pedagogical usefulness now. Return only supplied candidate IDs.",
      payload,
      metadata: { candidateCount: candidates.length, decisionsFallback: true },
    });
    if (fallbackResult.status === "ok") {
      decision = fallbackResult.data;
      model = fallbackResult.model;
      fallback = true;
    }
  }

  if (!decision) {
    return { recommendations: input.candidates, usedAI: false, fallback: true };
  }

  await putDecisionCache({
    userCourseId: input.userCourseId,
    operation: "recommendation_rerank",
    model,
    dimensions,
    source: payload,
    payload: decision,
    ttlSeconds: CACHE_TTL_SECONDS,
  });

  return {
    recommendations: [
      ...reconcileRecommendationRanking(candidates, decision),
      ...input.candidates.slice(candidates.length),
    ],
    usedAI: true,
    fallback,
    cached: false,
  };
}
