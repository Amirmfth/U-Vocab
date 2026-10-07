import type { TargetLanguage } from "@prisma/client";
import { targetLanguageConfig } from "@/lib/languages";
import {
  FIVE_LEVEL_SCORE,
  normalizedScore,
  predicateProbability,
  runNativeDecision,
  scoreAnswer,
  type DecisionQuestion,
} from "./native";

export async function scoreConversationFinalWithDecisions(input: {
  userId: string;
  userCourseId: string;
  targetLanguage: TargetLanguage;
  kind: "PRACTICE" | "MISSION";
  level: string;
  scenario: string;
  objective: string | null;
  targets: Array<{
    lexemeId: string;
    lemma: string;
    patterns: string[];
    uses: number;
    successfulUses: number;
  }>;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const language = targetLanguageConfig(input.targetLanguage);
  const providerTargets = input.targets.map((target, index) => ({
    key: "t" + index,
    lemma: target.lemma,
    patterns: target.patterns.slice(0, 4),
    priorUses: target.uses,
    priorSuccessfulUses: target.successfulUses,
  }));

  const questions: DecisionQuestion[] = [
    {
      type: "predicate",
      name: "taskSuccess",
      instructions:
        input.kind === "MISSION"
          ? "Did the learner actually achieve the stated conversational objective, rather than merely mention it?"
          : "Did the learner complete a meaningful practice conversation appropriate to the scenario?",
    },
    {
      type: "score",
      name: "grammar",
      instructions:
        "Score the learner's grammatical control in the target language at the requested CEFR level.",
      levels: [...FIVE_LEVEL_SCORE],
    },
    {
      type: "score",
      name: "naturalness",
      instructions:
        "Score how natural and context-appropriate the learner's language is for this conversation.",
      levels: [...FIVE_LEVEL_SCORE],
    },
    {
      type: "score",
      name: "vocabulary",
      instructions:
        "Score the learner's vocabulary control, lexical accuracy, and use of target expressions.",
      levels: [...FIVE_LEVEL_SCORE],
    },
    ...providerTargets.flatMap((target) => [
      {
        type: "predicate" as const,
        name: target.key + ":used",
        instructions:
          "Did the learner genuinely use target " + target.key + " (" + target.lemma + ") during the conversation?",
      },
      {
        type: "predicate" as const,
        name: target.key + ":correct",
        instructions:
          "If target " + target.key + " was used, was its use lexically and grammatically acceptable? If not used, answer false.",
      },
      {
        type: "score" as const,
        name: target.key + ":naturalness",
        instructions:
          "How natural was the learner's use of target " + target.key + "? If not used, score VERY_LOW.",
        levels: [...FIVE_LEVEL_SCORE],
      },
    ]),
  ];

  const result = await runNativeDecision({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "conversation_final_scoring",
    evidence: {
      targetLanguage: language.code,
      kind: input.kind,
      level: input.level,
      scenario: input.scenario,
      objective: input.objective,
      targets: providerTargets,
      messages: input.messages,
    },
    questions,
    metadata: {
      messageCount: input.messages.length,
      targetCount: input.targets.length,
      kind: input.kind,
      targetLanguage: language.code,
    },
  });
  if (result.status !== "ok") return result;

  const taskProbability = predicateProbability(result.answers, "taskSuccess");
  const grammarScore = normalizedScore(scoreAnswer(result.answers, "grammar"));
  const naturalnessScore = normalizedScore(scoreAnswer(result.answers, "naturalness"));
  const vocabularyScore = normalizedScore(scoreAnswer(result.answers, "vocabulary"));
  if (
    taskProbability === null ||
    grammarScore === null ||
    naturalnessScore === null ||
    vocabularyScore === null
  ) {
    return { status: "error" as const, error: "Final conversation Decisions scores were incomplete." };
  }

  const targetResults = input.targets.map((target, index) => {
    const key = "t" + index;
    const usedProbability = predicateProbability(result.answers, key + ":used");
    const correctProbability = predicateProbability(result.answers, key + ":correct");
    const naturalness = normalizedScore(
      scoreAnswer(result.answers, key + ":naturalness"),
    );
    return {
      lexemeId: target.lexemeId,
      used: (usedProbability ?? 0) >= 0.6,
      correct: (usedProbability ?? 0) >= 0.6 && (correctProbability ?? 0) >= 0.6,
      naturalness: naturalness ?? 0,
      note:
        (correctProbability ?? 0) >= 0.6
          ? "Target use accepted by Decisions scoring."
          : "Target use needs review.",
    };
  });

  const overallScore =
    Math.round(
      (grammarScore * 0.35 + naturalnessScore * 0.3 + vocabularyScore * 0.35) *
        100,
    ) / 100;

  return {
    status: "ok" as const,
    data: {
      taskSuccess: taskProbability >= 0.6,
      overallScore,
      grammarScore,
      naturalnessScore,
      vocabularyScore,
      targetResults,
    },
    model: result.response.model,
  };
}
