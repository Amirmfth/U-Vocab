import type { TargetLanguage } from "@prisma/client";
import { targetLanguageConfig } from "@/lib/languages";
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
  localErrorSignal,
} from "../evaluation-intelligence";

const ACCEPT_THRESHOLD = 0.62;
const CONFIDENT_THRESHOLD = 0.8;

function certainty(probability: number) {
  return Math.max(probability, 1 - probability);
}

export async function evaluateProductionWithDecisions(input: {
  userId: string;
  userCourseId?: string;
  targetLanguage?: TargetLanguage;
  exerciseType: string;
  exercisePrompt: string;
  expected?: string;
  lemma: string;
  partOfSpeech: string;
  patterns: string[];
  examples: string[];
  answer: string;
}) {
  const language = targetLanguageConfig(input.targetLanguage ?? "GERMAN");
  const localSignal = localErrorSignal(input.expected, input.answer);

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

  const questions: DecisionQuestion[] = [
    {
      type: "predicate",
      name: "correct",
      instructions:
        "Is the learner answer acceptable for the exercise goal and target lexical unit in " +
        language.promptName +
        "? Accept valid alternatives and inflections when the prompt permits them.",
    },
    {
      type: "score",
      name: "quality",
      instructions:
        "Score lexical correctness and naturalness of the learner answer for this exercise.",
      levels: [...FIVE_LEVEL_SCORE],
    },
    {
      type: "choice",
      name: "mistake",
      instructions:
        "If the answer is not acceptable, choose the primary error type. If acceptable, choose OTHER.",
      choices: mistakeChoices,
    },
    {
      type: "choice",
      name: "cause",
      instructions:
        "If the answer is not acceptable, choose the most plausible bounded learning cause. Use TYPO or ORTHOGRAPHY_GAP when the supplied local error signal strongly supports a near spelling slip.",
      choices: causeChoices,
    },
    {
      type: "choice",
      name: "intervention",
      instructions:
        "Choose the smallest useful next intervention. If the answer is acceptable, choose NONE.",
      choices: interventionChoices,
    },
  ];

  const result = await runNativeDecision({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "answer_evaluation",
    evidence: {
      targetLanguage: language.code,
      exerciseType: input.exerciseType,
      prompt: input.exercisePrompt,
      expected: input.expected ?? null,
      target: {
        lemma: input.lemma,
        partOfSpeech: input.partOfSpeech,
        patterns: input.patterns.slice(0, 4),
        examples: input.examples.slice(0, 3),
      },
      learnerAnswer: input.answer,
      localErrorSignal: localSignal,
    },
    questions,
    metadata: {
      answerChars: input.answer.length,
      exerciseType: input.exerciseType,
      localErrorSignal: localSignal.kind,
      targetLanguage: language.code,
    },
  });
  if (result.status !== "ok") return result;

  const correctProbability = predicateProbability(result.answers, "correct");
  const quality = normalizedScore(scoreAnswer(result.answers, "quality"));
  const mistake = choiceAnswer(result.answers, "mistake");
  const cause = choiceAnswer(result.answers, "cause");
  const intervention = choiceAnswer(result.answers, "intervention");
  if (
    correctProbability === null ||
    quality === null ||
    !mistake ||
    !cause ||
    !intervention
  ) {
    return { status: "error" as const, error: "Decisions evaluation was incomplete." };
  }

  const confidence = certainty(correctProbability);
  if (confidence < CONFIDENT_THRESHOLD) {
    return {
      status: "ambiguous" as const,
      confidence,
      probability: correctProbability,
    };
  }

  const correct = correctProbability >= ACCEPT_THRESHOLD;
  const mistakeType = evaluatorMistakeTypeSchema.safeParse(mistake.choice);
  const causeType = errorCauseSchema.safeParse(cause.choice);
  const interventionType = interventionSchema.safeParse(intervention.choice);
  const expected = input.expected ?? input.patterns[0] ?? input.lemma;

  return {
    status: "ok" as const,
    data: {
      correct,
      score: quality,
      confidence,
      feedback: correct
        ? "Accepted."
        : "Review the expected target form or pattern: " + expected + ".",
      retryPrompt: correct ? null : "Try again using the target pattern.",
      improvedSentence: null,
      mistakes: correct
        ? []
        : [
            {
              type: mistakeType.success ? mistakeType.data : ("OTHER" as const),
              expected,
              actual: input.answer,
              explanation:
                localSignal.kind === "NEAR_TYPO"
                  ? "The answer is very close to the expected form and appears primarily orthographic."
                  : "The answer does not match the expected lexical form or usage pattern.",
              cause: causeType.success ? causeType.data : ("AMBIGUOUS" as const),
              confidence,
              intervention: interventionType.success
                ? interventionType.data
                : ("RETRY" as const),
            },
          ],
      masteryEvidence: {
        recognition: "NONE" as const,
        meaningRecall: "NONE" as const,
        production: correct ? ("POSITIVE" as const) : ("NEGATIVE" as const),
        contextualUsage:
          input.exerciseType === "FREE_SENTENCE"
            ? correct
              ? ("POSITIVE" as const)
              : ("NEGATIVE" as const)
            : ("NONE" as const),
      },
    },
    model: result.response.model,
  };
}
