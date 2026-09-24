import {
  type ExerciseType,
  ReviewRating,
  VocabularyState,
} from "@prisma/client";
import { db } from "@/lib/db";
import { scheduleReview, type ReviewGrade } from "@/lib/fsrs";

function nextVocabularyState(stability: number): VocabularyState {
  if (stability >= 90) return "MASTERED";
  if (stability >= 30) return "ACTIVE";
  if (stability >= 7) return "FAMILIAR";
  return "LEARNING";
}

export async function applyReviewResult(input: {
  userId: string;
  userVocabularyId: string;
  grade: ReviewGrade;
  exerciseType: ExerciseType;
  prompt: string;
  durationMs?: number | null;
}) {
  const item = await db.userVocabulary.findFirst({
    where: { id: input.userVocabularyId, userId: input.userId },
  });
  if (!item) throw new Error("Vocabulary item not found.");

  const scheduled = scheduleReview(item.fsrsCard, input.grade);
  const state = nextVocabularyState(scheduled.stability);
  const recallGain =
    input.grade === "AGAIN"
      ? -0.03
      : input.grade === "HARD"
        ? 0.03
        : input.grade === "GOOD"
          ? 0.06
          : 0.09;

  const masteredAt =
    state === "MASTERED" && !item.masteredAt ? new Date() : item.masteredAt;

  await db.$transaction([
    db.userVocabulary.update({
      where: { id: item.id },
      data: {
        fsrsCard: scheduled.nextCard,
        stability: scheduled.stability,
        difficulty: scheduled.difficulty,
        retrievability: scheduled.retrievability,
        nextReviewAt: scheduled.due,
        state,
        masteredAt,
        meaningRecall: Math.max(0, Math.min(1, item.meaningRecall + recallGain)),
        production:
          ["FREE_SENTENCE", "PARAPHRASE", "COLLOCATION", "CASE_PREPOSITION"].includes(
            input.exerciseType,
          )
            ? Math.max(0, Math.min(1, item.production + recallGain / 2))
            : item.production,
        contextualUsage:
          ["CLOZE", "PARAPHRASE", "CONTEXTUAL_CHOICE"].includes(input.exerciseType)
            ? Math.max(0, Math.min(1, item.contextualUsage + recallGain / 2))
            : item.contextualUsage,
      },
    }),
    db.review.create({
      data: {
        userVocabularyId: item.id,
        rating: input.grade as ReviewRating,
        previousCard: scheduled.previousCard,
        nextCard: scheduled.nextCard,
      },
    }),
    db.attempt.create({
      data: {
        userId: input.userId,
        userVocabularyId: item.id,
        exerciseType: input.exerciseType,
        prompt: input.prompt,
        answer: input.grade,
        correct: input.grade !== "AGAIN",
        score:
          input.grade === "AGAIN"
            ? 0
            : input.grade === "HARD"
              ? 0.5
              : input.grade === "GOOD"
                ? 0.8
                : 1,
        durationMs: input.durationMs ?? null,
      },
    }),
  ]);

  return { item, scheduled, state };
}
