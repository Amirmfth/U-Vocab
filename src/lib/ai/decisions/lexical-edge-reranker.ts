import { z } from "zod";
import type { RelationType, VocabularyState } from "@prisma/client";
import { aiRoute } from "../routing";
import { getDecisionCache, putDecisionCache } from "./cache";
import { runStructuredDecision } from "./run-decision";

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

  if (
    !boundedCandidates.length ||
    process.env.AI_LEXICAL_EDGE_RERANK_ENABLED !== "true"
  ) {
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
  };

  const cached = await getDecisionCache<LexicalEdgeDecision>({
    userCourseId: input.userCourseId,
    operation: "lexical_edge_rerank",
    model: route.model,
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

  const result = await runStructuredDecision({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "lexical_edge_rerank",
    schema: lexicalEdgeRerankSchema,
    schemaName: "lexical_edge_rerank",
    system:
      "Choose the supplied lexical relationships that are most pedagogically useful for this learner now. Prefer relationships that resolve confusion, support active production, strengthen useful collocations or word families, and fit the learner level. You may only select supplied relation IDs.",
    payload,
    metadata: {
      candidateCount: boundedCandidates.length,
      surface: input.surface,
    },
  });

  if (result.status !== "ok") {
    return {
      relations: boundedRelations.slice(0, LEXICAL_EDGE_SELECTION_LIMIT),
      usedAI: false,
      fallback: true,
    };
  }

  await putDecisionCache({
    userCourseId: input.userCourseId,
    operation: "lexical_edge_rerank",
    model: result.model,
    dimensions,
    source: payload,
    payload: result.data,
    ttlSeconds: CACHE_TTL_SECONDS,
  });

  return {
    relations: reconcileLexicalEdges(boundedRelations, result.data),
    usedAI: true,
    fallback: false,
    cached: false,
  };
}
