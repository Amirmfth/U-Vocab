"use server";

import type { ExerciseType } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { evaluateVocabularyProduction } from "@/lib/ai/evaluate-production";
import { checkDeterministicAnswer } from "@/lib/exercises/check";
import { recordMistakes } from "@/lib/mistakes";

export type PracticeState = {
  status: "idle" | "success" | "error";
  feedback?: string;
  score?: number;
  retryPrompt?: string | null;
  improvedSentence?: string | null;
};

function masteryDelta(type: ExerciseType, correct: boolean) {
  const gain = correct ? 0.08 : -0.03;
  switch (type) {
    case "MEANING_RECALL":
    case "REVERSE_RECALL":
      return { meaningRecall: gain };
    case "ARTICLE":
      return { recognition: gain / 2, production: gain / 2 };
    case "CLOZE":
    case "CONTEXTUAL_CHOICE":
      return { contextualUsage: gain };
    default:
      return { production: gain, contextualUsage: correct ? 0.04 : 0 };
  }
}

export async function evaluatePractice(
  _previous: PracticeState,
  formData: FormData,
): Promise<PracticeState> {
  const userVocabularyId = String(formData.get("userVocabularyId") ?? "");
  const answer = String(formData.get("answer") ?? "").trim();
  const exerciseType = String(formData.get("exerciseType") ?? "") as ExerciseType;
  const prompt = String(formData.get("prompt") ?? "");
  const expected = String(formData.get("expected") ?? "").trim();
  const requiresAI = String(formData.get("requiresAI")) === "true";

  if (!userVocabularyId || !answer || !exerciseType || !prompt) {
    return { status: "error", feedback: "The exercise submission is incomplete." };
  }

  const user = await getCurrentUser();
  const item = await db.userVocabulary.findFirst({
    where: { id: userVocabularyId, userId: user.id },
    include: {
      lexeme: { include: { patterns: true, examples: true } },
    },
  });

  if (!item) {
    return { status: "error", feedback: "Vocabulary item not found." };
  }

  let evaluation: {
    correct: boolean;
    score: number;
    feedback: string;
    retryPrompt?: string | null;
    improvedSentence?: string | null;
    mistakes: Array<{
      type: "ARTICLE" | "CASE" | "PREPOSITION" | "REFLEXIVE" | "COLLOCATION" | "WORD_CHOICE" | "WORD_FORM" | "SPELLING" | "OTHER";
      expected: string | null;
      actual: string | null;
      explanation: string;
    }>;
  };

  if (!requiresAI && expected) {
    const deterministic = checkDeterministicAnswer(answer, expected);
    evaluation = {
      ...deterministic,
      retryPrompt: deterministic.correct ? null : "Try once more before revealing the expected form.",
      improvedSentence: null,
      mistakes: deterministic.correct
        ? []
        : [{
            type: exerciseType === "ARTICLE" ? "ARTICLE" : "WORD_FORM",
            expected,
            actual: answer,
            explanation: deterministic.feedback,
          }],
    };
  } else {
    evaluation = await evaluateVocabularyProduction({
      exerciseType,
      exercisePrompt: prompt,
      expected: expected || undefined,
      lemma: item.lexeme.lemma,
      partOfSpeech: item.lexeme.partOfSpeech,
      patterns: item.lexeme.patterns.map((pattern) => pattern.pattern),
      examples: item.lexeme.examples.map((example) => example.german),
      answer,
    });
  }

  await db.attempt.create({
    data: {
      userId: user.id,
      userVocabularyId: item.id,
      exerciseType,
      prompt,
      answer,
      expected: expected || null,
      correct: evaluation.correct,
      score: evaluation.score,
      feedback: evaluation.feedback,
    },
  });

  await recordMistakes(db, {
    userId: user.id,
    lexemeId: item.lexemeId,
    mistakes: evaluation.mistakes,
  });

  if (evaluation.correct) {
    const relatedTypes =
      exerciseType === "ARTICLE"
        ? ["ARTICLE"]
        : exerciseType === "CASE_PREPOSITION"
          ? ["CASE", "PREPOSITION", "REFLEXIVE"]
          : exerciseType === "COLLOCATION"
            ? ["COLLOCATION"]
            : [];

    if (relatedTypes.length) {
      await db.mistake.updateMany({
        where: {
          userId: user.id,
          lexemeId: item.lexemeId,
          type: { in: relatedTypes as never[] },
          resolvedAt: null,
        },
        data: { resolvedAt: new Date() },
      });
    }
  }

  const delta = masteryDelta(exerciseType, evaluation.correct);
  await db.userVocabulary.update({
    where: { id: item.id },
    data: {
      meaningRecall:
        delta.meaningRecall === undefined
          ? item.meaningRecall
          : Math.max(0, Math.min(1, item.meaningRecall + delta.meaningRecall)),
      recognition:
        delta.recognition === undefined
          ? item.recognition
          : Math.max(0, Math.min(1, item.recognition + delta.recognition)),
      production:
        delta.production === undefined
          ? item.production
          : Math.max(0, Math.min(1, item.production + delta.production)),
      contextualUsage:
        delta.contextualUsage === undefined
          ? item.contextualUsage
          : Math.max(0, Math.min(1, item.contextualUsage + delta.contextualUsage)),
    },
  });

  return {
    status: "success",
    feedback: evaluation.feedback,
    score: evaluation.score,
    retryPrompt: evaluation.retryPrompt,
    improvedSentence: evaluation.improvedSentence,
  };
}
