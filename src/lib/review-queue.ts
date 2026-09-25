import type { TranslationLanguage } from "@prisma/client";
import { db } from "@/lib/db";
import { buildExercise } from "@/lib/exercises/build";
import { selectReviewExerciseType } from "@/lib/exercises/review-select";
import type { ExerciseDefinition } from "@/lib/exercises/types";
import { isTranslationVisible } from "@/lib/translations";

export type ReviewQueueCard = {
  userVocabularyId: string;
  lexemeId: string;
  lemma: string;
  article: string | null;
  patterns: string[];
  translations: Array<{ language: string; text: string }>;
  exercise: ExerciseDefinition;
};

export type ReviewQueueData = {
  cards: ReviewQueueCard[];
  dueCount: number;
};

export async function getReviewQueueData(input: {
  userId: string;
  preferredTranslation: TranslationLanguage;
  limit?: number;
}): Promise<ReviewQueueData> {
  const now = new Date();
  const where = {
    userId: input.userId,
    OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
  };

  const [dueCount, items] = await Promise.all([
    db.userVocabulary.count({ where }),
    db.userVocabulary.findMany({
      where,
      include: {
        lexeme: {
          include: {
            translations: true,
            patterns: true,
            examples: true,
            mistakes: {
              where: { userId: input.userId, resolvedAt: null },
              select: { type: true },
            },
          },
        },
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { exerciseType: true },
        },
      },
      orderBy: [{ nextReviewAt: "asc" }, { addedAt: "asc" }],
      take: input.limit ?? 6,
    }),
  ]);

  return {
    dueCount,
    cards: items.map((item) => {
      const exerciseType = selectReviewExerciseType(
        {
          recognition: item.recognition,
          meaningRecall: item.meaningRecall,
          production: item.production,
          contextualUsage: item.contextualUsage,
          mistakeTypes: item.lexeme.mistakes.map((mistake) => mistake.type),
        },
        item.attempts.map((attempt) => attempt.exerciseType),
      );

      return {
        userVocabularyId: item.id,
        lexemeId: item.lexemeId,
        lemma: item.lexeme.lemma,
        article: item.lexeme.article,
        patterns: item.lexeme.patterns.map((pattern) => pattern.pattern),
        translations: item.lexeme.translations
          .filter((translation) =>
            isTranslationVisible(
              input.preferredTranslation,
              translation.language,
            ),
          )
          .map((translation) => ({
            language: translation.language,
            text: translation.text,
          })),
        exercise: buildExercise(
          exerciseType,
          item.lexeme,
          input.preferredTranslation,
        ),
      };
    }),
  };
}
