"use server";

import type { ExerciseType } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { applyReviewResult } from "@/lib/review-service";
import type { ReviewGrade } from "@/lib/fsrs";
import { revalidateUserDomains } from "@/lib/cache-tags";

function safeDuration(startedAt: number) {
  if (!Number.isFinite(startedAt) || startedAt <= 0) return null;
  return Math.max(0, Math.min(Date.now() - startedAt, 30 * 60 * 1000));
}

async function persistReview(input: ReviewMutationInput) {
  if (
    !input.userVocabularyId ||
    !["AGAIN", "HARD", "GOOD", "EASY"].includes(input.grade)
  ) {
    throw new Error("Invalid review submission.");
  }

  const user = await getCurrentUser();
  const result = await applyReviewResult({
    userId: user.id,
    userVocabularyId: input.userVocabularyId,
    grade: input.grade,
    exerciseType: input.exerciseType,
    prompt: input.prompt,
    durationMs: safeDuration(input.startedAt),
  });

  revalidateUserDomains(
    user.id,
    ["home", "vocabulary", "review", "progress"],
    [result.item.lexemeId],
  );

  return result;
}

export type ReviewMutationInput = {
  userVocabularyId: string;
  grade: ReviewGrade;
  exerciseType: ExerciseType;
  prompt: string;
  startedAt: number;
};

export type ReviewMutationResult =
  | { status: "success" }
  | { status: "error"; message: string };

export async function submitReviewMutation(
  input: ReviewMutationInput,
): Promise<ReviewMutationResult> {
  try {
    await persistReview(input);
    return { status: "success" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not save this review.",
    };
  }
}
