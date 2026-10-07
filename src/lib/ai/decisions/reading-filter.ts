import {
  FIVE_LEVEL_SCORE,
  choiceAnswer,
  normalizedScore,
  runNativeDecision,
  scoreAnswer,
  type DecisionQuestion,
} from "./native";

export const READING_DECISION_CANDIDATE_LIMIT = 30;
export const READING_ENRICHMENT_LIMIT = 12;

const UNIT_TYPES = [
  "WORD",
  "COLLOCATION",
  "PHRASE",
  "IDIOM",
  "VERB_PATTERN",
  "OTHER",
] as const;

export type ReadingFilterCandidate = {
  token: string;
  count: number;
};

export async function filterReadingCandidatesWithDecisions(input: {
  userId: string;
  userCourseId: string;
  targetLanguageCode: string;
  targetLevel: string;
  excerpt: string;
  candidates: ReadingFilterCandidate[];
}) {
  const bounded = input.candidates.slice(0, READING_DECISION_CANDIDATE_LIMIT);
  if (!bounded.length) {
    return { status: "ok" as const, candidates: [] as ReadingFilterCandidate[] };
  }

  const providerCandidates = bounded.map((candidate, index) => ({
    key: "c" + index,
    token: candidate.token,
    count: candidate.count,
  }));
  const questions: DecisionQuestion[] = providerCandidates.flatMap((candidate) => [
    {
      type: "score" as const,
      name: candidate.key + ":usefulness",
      instructions:
        "How useful is candidate " + candidate.key +
        " as a lexical learning item for a learner at the supplied target CEFR level in this excerpt? Prefer meaningful lexical units, collocations, idioms, useful verb patterns, and content words over function words or accidental fragments.",
      levels: [...FIVE_LEVEL_SCORE],
    },
    {
      type: "choice" as const,
      name: candidate.key + ":type",
      instructions:
        "Classify candidate " + candidate.key + " as the most appropriate lexical-unit type.",
      choices: UNIT_TYPES.map((value) => ({
        value,
        description: value.replaceAll("_", " ").toLowerCase(),
      })),
    },
  ]);

  const result = await runNativeDecision({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "reading_analysis",
    evidence: {
      targetLanguage: input.targetLanguageCode,
      targetLevel: input.targetLevel,
      excerpt: input.excerpt,
      candidates: providerCandidates,
    },
    questions,
    metadata: {
      phase: "candidate_filter",
      candidateCount: bounded.length,
      excerptChars: input.excerpt.length,
    },
  });
  if (result.status !== "ok") return result;

  const ranked = providerCandidates
    .map((candidate, index) => {
      const usefulness = normalizedScore(
        scoreAnswer(result.answers, candidate.key + ":usefulness"),
      );
      const kind = choiceAnswer(result.answers, candidate.key + ":type");
      return {
        original: bounded[index],
        usefulness: usefulness ?? 0,
        kind:
          kind && typeof kind.choice === "string"
            ? kind.choice
            : "OTHER",
      };
    })
    .filter((item) => item.usefulness >= 0.2 && item.kind !== "OTHER")
    .sort((a, b) => b.usefulness - a.usefulness)
    .slice(0, READING_ENRICHMENT_LIMIT)
    .map((item) => item.original);

  return {
    status: "ok" as const,
    candidates: ranked.length
      ? ranked
      : bounded.slice(0, Math.min(READING_ENRICHMENT_LIMIT, bounded.length)),
    model: result.response.model,
  };
}
