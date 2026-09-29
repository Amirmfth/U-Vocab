"use server";

import type { ExerciseType } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { applyReviewResult } from "@/lib/review-service";
import type { ReviewGrade } from "@/lib/fsrs";
import { revalidateUserDomains } from "@/lib/cache-tags";
import { getServerTranslator } from "@/i18n/server";

export type RescueReviewInput = {
  userVocabularyId: string;
  grade: ReviewGrade;
  exerciseType: ExerciseType;
  prompt: string;
  startedAt: number;
};

export async function submitRescueReview(input: RescueReviewInput) {
  const user = await getCurrentUser();
  const { t } = await getServerTranslator(user);

  try {
    if (
      !input.userVocabularyId ||
      !["AGAIN", "HARD", "GOOD", "EASY"].includes(input.grade)
    ) {
      throw new Error(t("rescue.invalid"));
    }

    const course = await getCurrentCourse();
    const durationMs =
      Number.isFinite(input.startedAt) && input.startedAt > 0
        ? Math.max(0, Math.min(Date.now() - input.startedAt, 30 * 60 * 1000))
        : null;
    const result = await applyReviewResult({
      userId: user.id,
      userCourseId: course.id,
      userVocabularyId: input.userVocabularyId,
      grade: input.grade,
      exerciseType: input.exerciseType,
      prompt: input.prompt,
      durationMs,
      allowEarlyReview: true,
    });

    revalidateUserDomains(
      user.id,
      course.id,
      ["home", "vocabulary", "review", "progress"],
      [result.item.lexemeId],
    );
    return { status: "success" as const };
  } catch (error) {
    return {
      status: "error" as const,
      message:
        error instanceof Error ? error.message : t("rescue.saveError"),
    };
  }
}
