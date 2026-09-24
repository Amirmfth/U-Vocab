"use server";

import { ReviewRating, VocabularyState } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { scheduleReview, type ReviewGrade } from "@/lib/fsrs";

function nextVocabularyState(stability: number): VocabularyState {
  if (stability >= 90) return "MASTERED";
  if (stability >= 30) return "ACTIVE";
  if (stability >= 7) return "FAMILIAR";
  return "LEARNING";
}

export async function submitReview(formData: FormData) {
  const id = String(formData.get("userVocabularyId") ?? "");
  const grade = String(formData.get("grade") ?? "") as ReviewGrade;
  if (!id || !["AGAIN", "HARD", "GOOD", "EASY"].includes(grade)) {
    throw new Error("Invalid review submission.");
  }

  const user = await getCurrentUser();
  const item = await db.userVocabulary.findFirst({
    where: { id, userId: user.id },
  });
  if (!item) throw new Error("Vocabulary item not found.");

  const scheduled = scheduleReview(item.fsrsCard, grade);
  const state = nextVocabularyState(scheduled.stability);

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
        meaningRecall: {
          increment: grade === "AGAIN" ? 0 : grade === "HARD" ? 0.03 : grade === "GOOD" ? 0.06 : 0.09,
        },
      },
    }),
    db.review.create({
      data: {
        userVocabularyId: item.id,
        rating: grade as ReviewRating,
        previousCard: scheduled.previousCard,
        nextCard: scheduled.nextCard,
      },
    }),
    db.attempt.create({
      data: {
        userId: user.id,
        userVocabularyId: item.id,
        exerciseType: "MEANING_RECALL",
        prompt: "Recall the meaning and usage of this lexical unit.",
        answer: grade,
        correct: grade !== "AGAIN",
        score: grade === "AGAIN" ? 0 : grade === "HARD" ? 0.5 : grade === "GOOD" ? 0.8 : 1,
      },
    }),
  ]);

  redirect("/review");
}
