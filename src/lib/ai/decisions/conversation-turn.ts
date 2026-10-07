import {
  choiceAnswer,
  FIVE_LEVEL_SCORE,
  normalizedScore,
  predicateProbability,
  runNativeDecision,
  scoreAnswer,
  type DecisionQuestion,
} from "./native";
import {
  errorCauseSchema,
  evaluatorMistakeTypeSchema,
  interventionSchema,
  type MasteryEvidence,
} from "../evaluation-intelligence";
import type { TargetLanguage } from "@prisma/client";
import { targetLanguageConfig } from "@/lib/languages";
import type { EvaluationLocale } from "@/lib/evaluation-locale";

const BOOLEAN_THRESHOLD = 0.6;

function confidenceFromPredicate(probability: number) {
  return Math.max(probability, 1 - probability);
}

function masteryEvidence(correct: boolean, used: boolean): MasteryEvidence {
  return {
    recognition: "NONE",
    meaningRecall: "NONE",
    production: used ? (correct ? "POSITIVE" : "NEGATIVE") : "NONE",
    contextualUsage: used ? (correct ? "POSITIVE" : "NEGATIVE") : "NONE",
  };
}

export async function evaluateConversationTurnWithDecisions(input: {
  userId: string;
  userCourseId: string;
  targetLanguage: TargetLanguage;
  evaluationLocale: EvaluationLocale;
  level: string;
  message: string;
  targets: Array<{
    lexemeId: string;
    lemma: string;
    patterns: string[];
  }>;
}) {
  const language = targetLanguageConfig(input.targetLanguage);
  const providerTargets = input.targets.map((target, index) => ({
    key: "t" + index,
    lemma: target.lemma,
    patterns: target.patterns.slice(0, 4),
  }));

  const mistakeChoices = evaluatorMistakeTypeSchema.options.map((value) => ({
    value,
    description: value.replaceAll("_", " ").toLowerCase(),
  }));
  const causeChoices = errorCauseSchema.options.map((value) => ({
    value,
    description: value.replaceAll("_", " ").toLowerCase(),
  }));
  const interventionChoices = interventionSchema.options.map((value) => ({
    value,
    description: value.replaceAll("_", " ").toLowerCase(),
  }));

  const questions: DecisionQuestion[] = providerTargets.flatMap((target) => [
    {
      type: "predicate" as const,
      name: target.key + ":used",
      instructions:
        "Did the learner genuinely attempt to use target " + target.key +
        " (" + target.lemma + ") in the message? Inflected or naturally transformed uses count.",
    },
    {
      type: "predicate" as const,
      name: target.key + ":correct",
      instructions:
        "If target " + target.key + " was attempted, was its lexical use correct in " +
        language.promptName +
        ", including required morphology, governed pattern, collocation, agreement, spelling, and register? If it was not attempted, answer false.",
    },
    {
      type: "score" as const,
      name: target.key + ":naturalness",
      instructions:
        "How natural and context-appropriate is the learner's use of target " +
        target.key + "? If it was not attempted, score VERY_LOW.",
      levels: [...FIVE_LEVEL_SCORE],
    },
    {
      type: "choice" as const,
      name: target.key + ":mistake",
      instructions:
        "If target " + target.key +
        " was used incorrectly, choose the primary error type. If there is no error, choose OTHER.",
      choices: mistakeChoices,
    },
    {
      type: "choice" as const,
      name: target.key + ":cause",
      instructions:
        "If target " + target.key +
        " was used incorrectly, choose the most plausible bounded learning cause from the supplied options. Do not infer personality or mental state.",
      choices: causeChoices,
    },
    {
      type: "choice" as const,
      name: target.key + ":intervention",
      instructions:
        "Choose the smallest useful learning intervention for target " + target.key +
        ". If no correction is needed, choose NONE.",
      choices: interventionChoices,
    },
  ]);

  const result = await runNativeDecision({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "conversation_turn_evaluation",
    evidence: {
      language: language.code,
      learnerLevel: input.level,
      learnerMessage: input.message,
      targets: providerTargets,
    },
    questions,
    metadata: {
      targetCount: input.targets.length,
      messageChars: input.message.length,
      targetLanguage: language.code,
    },
  });
  if (result.status !== "ok") return result;

  const targetUsage = input.targets.map((target, index) => {
    const key = "t" + index;
    const usedProbability = predicateProbability(result.answers, key + ":used");
    const correctProbability = predicateProbability(result.answers, key + ":correct");
    const naturalness = normalizedScore(
      scoreAnswer(result.answers, key + ":naturalness"),
    );
    if (usedProbability === null || correctProbability === null || naturalness === null) {
      throw new Error("Decisions response is missing required conversation answers.");
    }

    const used = usedProbability >= BOOLEAN_THRESHOLD;
    const correct = used && correctProbability >= BOOLEAN_THRESHOLD;
    const confidence = confidenceFromPredicate(correctProbability);
    const mistakeChoice = choiceAnswer(result.answers, key + ":mistake");
    const causeChoice = choiceAnswer(result.answers, key + ":cause");
    const interventionChoice = choiceAnswer(result.answers, key + ":intervention");
    const parsedMistake = evaluatorMistakeTypeSchema.safeParse(mistakeChoice?.choice);
    const parsedCause = errorCauseSchema.safeParse(causeChoice?.choice);
    const parsedIntervention = interventionSchema.safeParse(interventionChoice?.choice);
    const pattern = target.patterns[0] ?? target.lemma;

    return {
      lexemeId: target.lexemeId,
      used,
      correct,
      score: naturalness,
      confidence,
      feedback: !used
        ? "Target not attempted."
        : correct
          ? "Target used acceptably in context."
          : "Review the lexical pattern for “" + target.lemma + "”: " + pattern + ".",
      mistakes:
        used && !correct
          ? [
              {
                type: parsedMistake.success ? parsedMistake.data : ("OTHER" as const),
                expected: pattern,
                actual: input.message.slice(0, 500),
                explanation:
                  "The attempted use of “" + target.lemma +
                  "” does not match its expected lexical pattern or context.",
                cause: parsedCause.success ? parsedCause.data : ("AMBIGUOUS" as const),
                confidence,
                intervention: parsedIntervention.success
                  ? parsedIntervention.data
                  : ("SHORT_HINT" as const),
              },
            ]
          : [],
      masteryEvidence: masteryEvidence(correct, used),
    };
  });

  const firstCorrection = targetUsage.find(
    (usage) => usage.used && !usage.correct && usage.confidence >= 0.6,
  );

  return {
    status: "ok" as const,
    data: {
      targetUsage,
      relevantCorrection: firstCorrection
        ? firstCorrection.feedback
        : null,
    },
    model: result.response.model,
  };
}
