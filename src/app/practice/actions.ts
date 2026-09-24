"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { evaluateVocabularyProduction } from "@/lib/ai/evaluate-production";

export type PracticeState = {
  status: "idle" | "success" | "error";
  feedback?: string;
  score?: number;
  improvedSentence?: string | null;
};

export async function evaluatePractice(
  _previous: PracticeState,
  formData: FormData,
): Promise<PracticeState> {
  const userVocabularyId = String(formData.get("userVocabularyId") ?? "");
  const answer = String(formData.get("answer") ?? "").trim();
  if (!userVocabularyId || !answer) {
    return { status: "error", feedback: "Write a German sentence before submitting." };
  }

  const user = await getCurrentUser();
  const item = await db.userVocabulary.findFirst({
    where: { id: userVocabularyId, userId: user.id },
    include: {
      lexeme: { include: { patterns: true, examples: true } },
    },
  });
  if (!item) return { status: "error", feedback: "Vocabulary item not found." };

  const evaluation = await evaluateVocabularyProduction({
    lemma: item.lexeme.lemma,
    partOfSpeech: item.lexeme.partOfSpeech,
    patterns: item.lexeme.patterns.map((pattern) => pattern.pattern),
    examples: item.lexeme.examples.map((example) => example.german),
    answer,
  });

  await db.attempt.create({
    data: {
      userId: user.id,
      userVocabularyId: item.id,
      exerciseType: "FREE_SENTENCE",
      prompt: `Write a natural German sentence using ${item.lexeme.lemma}.`,
      answer,
      correct: evaluation.correct,
      score: evaluation.score,
      feedback: evaluation.feedback,
    },
  });

  for (const mistake of evaluation.mistakes) {
    const existing = await db.mistake.findFirst({
      where: {
        userId: user.id,
        lexemeId: item.lexemeId,
        type: mistake.type,
        resolvedAt: null,
      },
    });

    if (existing) {
      await db.mistake.update({
        where: { id: existing.id },
        data: {
          occurrences: { increment: 1 },
          expected: mistake.expected,
          actual: mistake.actual,
          explanation: mistake.explanation,
          lastOccurredAt: new Date(),
        },
      });
    } else {
      await db.mistake.create({
        data: {
          userId: user.id,
          lexemeId: item.lexemeId,
          type: mistake.type,
          expected: mistake.expected,
          actual: mistake.actual,
          explanation: mistake.explanation,
        },
      });
    }
  }

  await db.userVocabulary.update({
    where: { id: item.id },
    data: {
      production: evaluation.correct
        ? Math.min(1, item.production + 0.1)
        : Math.max(0, item.production - 0.03),
      contextualUsage: evaluation.correct
        ? Math.min(1, item.contextualUsage + 0.07)
        : item.contextualUsage,
    },
  });

  return {
    status: "success",
    feedback: evaluation.feedback,
    score: evaluation.score,
    improvedSentence: evaluation.improvedSentence,
  };
}
