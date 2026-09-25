import {
  type ExerciseType,
  ReviewRating,
  VocabularyState,
} from "@prisma/client";
import { db } from "@/lib/db";
import { scheduleReview, type ReviewGrade } from "@/lib/fsrs";
import { applyMasteryDelta, reviewMasteryDelta } from "@/lib/exercises/mastery";

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
  const mastery = applyMasteryDelta(item, reviewMasteryDelta(input.exerciseType, input.grade));

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
        recognition: mastery.recognition,
        meaningRecall: mastery.meaningRecall,
        production: mastery.production,
        contextualUsage: mastery.contextualUsage,
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
