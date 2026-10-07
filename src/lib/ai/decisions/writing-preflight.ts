import {
  FIVE_LEVEL_SCORE,
  choiceAnswer,
  normalizedScore,
  predicateProbability,
  runNativeDecision,
  scoreAnswer,
  type DecisionQuestion,
} from "./native";
import type { TargetLanguage } from "@prisma/client";
import { targetLanguageConfig } from "@/lib/languages";

const DIMENSIONS = [
  "taskCompletion",
  "organization",
  "grammar",
  "vocabularyRange",
  "vocabularyAccuracy",
  "naturalness",
] as const;

export type WritingDecisionScores = Record<(typeof DIMENSIONS)[number], number>;

export async function evaluateWritingWithDecisions(input: {
  userId: string;
  userCourseId: string;
  targetLanguage: TargetLanguage;
  level: string;
  task: string;
  draft: string;
  targetWords: number;
  repeatedWords: Array<{ word: string; count: number }>;
  requiredTargets: Array<{ lexemeId: string; lemma: string; patterns: string[] }>;
}) {
  const language = targetLanguageConfig(input.targetLanguage);
  const providerTargets = input.requiredTargets.map((target, index) => ({
    key: "t" + index,
    lemma: target.lemma,
    patterns: target.patterns.slice(0, 4),
  }));

  const questions: DecisionQuestion[] = [
    ...DIMENSIONS.map((dimension) => ({
      type: "score" as const,
      name: "rubric:" + dimension,
      instructions:
        "Score the learner draft for " + dimension +
        " at the requested CEFR level. VERY_LOW means largely unsuccessful; VERY_HIGH means consistently strong for the requested level.",
      levels: [...FIVE_LEVEL_SCORE],
    })),
    {
      type: "choice" as const,
      name: "complexity",
      instructions:
        "Choose the evaluator complexity required for nuanced, reliable feedback on this draft. FAST is appropriate for straightforward lower/intermediate writing with clear errors; COMPLEX is required for advanced, subtle, highly ambiguous, or discourse-heavy writing.",
      choices: [
        { value: "FAST", description: "Straightforward evaluation." },
        { value: "COMPLEX", description: "Nuanced advanced evaluation." },
      ],
    },
    ...providerTargets.flatMap((target) => [
      {
        type: "predicate" as const,
        name: target.key + ":used",
        instructions:
          "Did the learner genuinely use target " + target.key +
          " (" + target.lemma + ") in the draft, including valid inflected forms?",
      },
      {
        type: "predicate" as const,
        name: target.key + ":correct",
        instructions:
          "If target " + target.key +
          " was used, was its lexical use correct and natural enough for the requested level? If not used, answer false.",
      },
      {
        type: "score" as const,
        name: target.key + ":naturalness",
        instructions:
          "How natural is the learner's use of target " + target.key +
          "? If not used, score VERY_LOW.",
        levels: [...FIVE_LEVEL_SCORE],
      },
    ]),
  ];

  const result = await runNativeDecision({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "writing_decision_preflight",
    evidence: {
      targetLanguage: language.code,
      level: input.level,
      task: input.task,
      targetWords: input.targetWords,
      repeatedWords: input.repeatedWords.slice(0, 12),
      requiredTargets: providerTargets,
      draft: input.draft,
    },
    questions,
    metadata: {
      draftChars: input.draft.length,
      targetCount: providerTargets.length,
      targetLanguage: language.code,
    },
  });
  if (result.status !== "ok") return result;

  const scores = {} as WritingDecisionScores;
  for (const dimension of DIMENSIONS) {
    const value = normalizedScore(
      scoreAnswer(result.answers, "rubric:" + dimension),
    );
    if (value === null) {
      return { status: "error" as const, error: "Writing Decisions scores were incomplete." };
    }
    scores[dimension] = value;
  }

  const complexityAnswer = choiceAnswer(result.answers, "complexity");
  const complexity: "FAST" | "COMPLEX" =
    complexityAnswer?.choice === "FAST" ? "FAST" : "COMPLEX";

  const targetUsage = input.requiredTargets.map((target, index) => {
    const key = "t" + index;
    const usedProbability = predicateProbability(result.answers, key + ":used");
    const correctProbability = predicateProbability(result.answers, key + ":correct");
    const naturalness = normalizedScore(
      scoreAnswer(result.answers, key + ":naturalness"),
    );
    if (
      usedProbability === null ||
      correctProbability === null ||
      naturalness === null
    ) {
      throw new Error("Writing target Decisions answers were incomplete.");
    }
    const used = usedProbability >= 0.6;
    const correct = used && correctProbability >= 0.6;
    return {
      lexemeId: target.lexemeId,
      used,
      correct,
      naturalness,
      confidence: Math.max(correctProbability, 1 - correctProbability),
      note: correct
        ? "Target use accepted by Decisions scoring."
        : used
          ? "Target use needs review."
          : "Target not used.",
    };
  });

  return {
    status: "ok" as const,
    data: { scores, complexity, targetUsage },
    model: result.response.model,
  };
}
