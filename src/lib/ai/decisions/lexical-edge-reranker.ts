import { z } from "zod";
import type { RelationType, VocabularyState } from "@prisma/client";
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

export const LEXICAL_EDGE_CANDIDATE_LIMIT = 12;
export const LEXICAL_EDGE_SELECTION_LIMIT = 5;
const CACHE_TTL_SECONDS = 8 * 60 * 60;

export const lexicalEdgePurposeSchema = z.enum([
  "WORD_FAMILY",
  "CONTRAST",
  "COLLOCATION",
  "GRAMMAR_SUPPORT",
  "CONFUSION_RESOLUTION",
  "ACTIVE_PRODUCTION",
  "CONTEXT_EXPANSION",
]);

export const lexicalEdgeRerankSchema = z.object({
  selected: z.array(
    z.object({
      relationId: z.string(),
      priority: z.number().min(0).max(1),
      purpose: lexicalEdgePurposeSchema,
    }),
  ).max(LEXICAL_EDGE_SELECTION_LIMIT),
});

export type LexicalEdgeDecision = z.infer<typeof lexicalEdgeRerankSchema>;

export type LexicalEdgeCandidate = {
  relationId: string;
  relationType: RelationType;
  targetLexemeId: string;
  targetLemma: string;
  targetCefrLevel: string | null;
  targetKnownState: VocabularyState | "UNKNOWN";
  recentEncounter: boolean;
  recurringConfusion: boolean;
};

export function reconcileLexicalEdges<T extends { id: string }>(
  deterministic: T[],
  decision: LexicalEdgeDecision,
) {
  const byId = new Map(deterministic.map((relation) => [relation.id, relation]));
  const seen = new Set<string>();
  const selected: Array<T & { aiPurpose?: z.infer<typeof lexicalEdgePurposeSchema>; aiPriority?: number }> = [];

  for (const item of decision.selected) {
    if (seen.has(item.relationId)) continue;
    const relation = byId.get(item.relationId);
    if (!relation) continue;
    seen.add(item.relationId);
    selected.push({
      ...relation,
      aiPurpose: item.purpose,
      aiPriority: Math.max(0, Math.min(1, item.priority)),
    });
  }

  for (const relation of deterministic) {
    if (selected.length >= LEXICAL_EDGE_SELECTION_LIMIT) break;
    if (!seen.has(relation.id)) selected.push(relation);
  }
  return selected;
}

function lexicalQuestions(candidates: LexicalEdgeCandidate[]): DecisionQuestion[] {
  const purposes = lexicalEdgePurposeSchema.options.map((value) => ({
    value,
    description: value.replaceAll("_", " ").toLowerCase(),
  }));
  return candidates.flatMap((candidate) => [
    {
      type: "score" as const,
      name: "relevance:" + candidate.relationId,
      instructions:
        "How pedagogically useful is relation " + candidate.relationId +
        " for this learner now? Prefer confusion resolution, active production, useful collocations, word families, grammar support, and level fit.",
      levels: [...FIVE_LEVEL_SCORE],
    },
    {
      type: "choice" as const,
      name: "purpose:" + candidate.relationId,
      instructions:
        "What is the primary pedagogical purpose of relation " +
        candidate.relationId + " for this learner now?",
      choices: purposes,
    },
  ]);
}

function decisionFromNative(
  candidates: LexicalEdgeCandidate[],
  answers: DecisionAnswerMap,
): LexicalEdgeDecision {
  return {
    selected: candidates
      .map((candidate) => {
        const priority = normalizedScore(
          scoreAnswer(answers, "relevance:" + candidate.relationId),
        );
        const purpose = choiceAnswer(answers, "purpose:" + candidate.relationId);
        if (priority === null || !purpose || typeof purpose.choice !== "string") {
          return null;
        }
        const parsedPurpose = lexicalEdgePurposeSchema.safeParse(purpose.choice);
        if (!parsedPurpose.success) return null;
        return {
          relationId: candidate.relationId,
          priority,
          purpose: parsedPurpose.data,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, LEXICAL_EDGE_SELECTION_LIMIT),
  };
}

export async function rerankLexicalEdges<T extends { id: string }>(input: {
  userId: string;
  userCourseId: string;
  sourceLexemeId: string;
  sourceMastery: {
    recognition: number;
    meaningRecall: number;
    production: number;
    contextualUsage: number;
  };
  currentLevel: string;
  targetLevel: string;
  mistakeTypes: string[];
  surface: "word_detail" | "teach";
  candidates: LexicalEdgeCandidate[];
  relations: T[];
}) {
  const boundedCandidates = input.candidates.slice(0, LEXICAL_EDGE_CANDIDATE_LIMIT);
  const boundedRelations = input.relations.slice(0, LEXICAL_EDGE_CANDIDATE_LIMIT);
  const legacyEnabled = process.env.AI_LEXICAL_EDGE_RERANK_ENABLED === "true";
  const mode = decisionRolloutMode(
    "OPENAI_DECISIONS_LEXICAL_EDGES_MODE",
    legacyEnabled,
  );

  if (!boundedCandidates.length || (!legacyEnabled && mode === "off")) {
    return {
      relations: boundedRelations.slice(0, LEXICAL_EDGE_SELECTION_LIMIT),
      usedAI: false,
      fallback: false,
    };
  }

  const route = aiRoute("lexical_edge_rerank");
  const payload = {
    learner: {
      currentLevel: input.currentLevel,
      targetLevel: input.targetLevel,
      sourceMastery: input.sourceMastery,
      unresolvedMistakeTypes: input.mistakeTypes.slice(0, 5),
      surface: input.surface,
    },
    candidates: boundedCandidates,
  };
  const dimensions = {
    sourceLexemeId: input.sourceLexemeId,
    surface: input.surface,
    relationIds: boundedCandidates.map((candidate) => candidate.relationId),
    mode: shouldUseNativeDecision(mode) ? "decisions" : "responses",
  };

  const cached = await getDecisionCache<LexicalEdgeDecision>({
    userCourseId: input.userCourseId,
    operation: "lexical_edge_rerank",
    model: shouldUseNativeDecision(mode) ? "gpt-6-luna" : route.model,
    dimensions,
    source: payload,
  });
  if (cached) {
    return {
      relations: reconcileLexicalEdges(boundedRelations, cached),
      usedAI: true,
      fallback: false,
      cached: true,
    };
  }

  const nativePromise = shouldRunNativeDecision(mode)
    ? runNativeDecision({
        userId: input.userId,
        userCourseId: input.userCourseId,
        operation: "lexical_edge_rerank",
        evidence: payload,
        questions: lexicalQuestions(boundedCandidates),
        metadata: {
          shadow: mode === "shadow",
          candidateCount: boundedCandidates.length,
          surface: input.surface,
        },
      })
    : Promise.resolve(null);
  const legacyPromise =
    mode === "on"
      ? Promise.resolve(null)
      : runStructuredDecision({
          userId: input.userId,
          userCourseId: input.userCourseId,
          operation: "lexical_edge_rerank",
          schema: lexicalEdgeRerankSchema,
          schemaName: "lexical_edge_rerank",
          system:
            "Choose only supplied lexical relationships that are most pedagogically useful for this learner now.",
          payload,
          metadata: { candidateCount: boundedCandidates.length, surface: input.surface },
        });

  const [nativeResult, legacyResult] = await Promise.all([nativePromise, legacyPromise]);
  let decision: LexicalEdgeDecision | null = null;
  let model = route.model;
  let fallback = false;

  if (shouldUseNativeDecision(mode) && nativeResult?.status === "ok") {
    decision = decisionFromNative(boundedCandidates, nativeResult.answers);
    model = nativeResult.response.model;
  } else if (legacyResult?.status === "ok") {
    decision = legacyResult.data;
    model = legacyResult.model;
    fallback = shouldUseNativeDecision(mode);
  } else if (shouldUseNativeDecision(mode)) {
    const fallbackResult = await runStructuredDecision({
      userId: input.userId,
      userCourseId: input.userCourseId,
      operation: "lexical_edge_rerank",
      schema: lexicalEdgeRerankSchema,
      schemaName: "lexical_edge_rerank",
      system: "Select only supplied relationship IDs.",
      payload,
      metadata: { candidateCount: boundedCandidates.length, decisionsFallback: true },
    });
    if (fallbackResult.status === "ok") {
      decision = fallbackResult.data;
      model = fallbackResult.model;
      fallback = true;
    }
  }

  if (!decision) {
    return {
      relations: boundedRelations.slice(0, LEXICAL_EDGE_SELECTION_LIMIT),
      usedAI: false,
      fallback: true,
    };
  }

  await putDecisionCache({
    userCourseId: input.userCourseId,
    operation: "lexical_edge_rerank",
    model,
    dimensions,
    source: payload,
    payload: decision,
    ttlSeconds: CACHE_TTL_SECONDS,
  });

  return {
    relations: reconcileLexicalEdges(boundedRelations, decision),
    usedAI: true,
    fallback,
    cached: false,
  };
}
