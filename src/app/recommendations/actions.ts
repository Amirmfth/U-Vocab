"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { prepareRecommendationEmbeddings } from "@/lib/recommendations";
import { recordProductEvent } from "@/lib/product-events";

export type RecommendationActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function addRecommendation(
  _previous: RecommendationActionState,
  formData: FormData,
): Promise<RecommendationActionState> {
  const lexemeId = String(formData.get("lexemeId") ?? "");
  if (!lexemeId) return { status: "error", message: "Recommendation is missing." };

  try {
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    const language = targetLanguageConfig(course.targetLanguage);
    const lexeme = await db.lexeme.findFirst({
      where: { id: lexemeId, language: language.code },
      select: { id: true },
    });
    if (!lexeme) return { status: "error", message: "Recommendation not found." };

    await db.$transaction([
      db.userVocabulary.upsert({
        where: { userCourseId_lexemeId: { userCourseId: course.id, lexemeId } },
        create: { userId: user.id, userCourseId: course.id, lexemeId },
        update: {},
      }),
      db.recommendationFeedback.upsert({
        where: { userCourseId_lexemeId: { userCourseId: course.id, lexemeId } },
        create: {
          userId: user.id,
          userCourseId: course.id,
          lexemeId,
          action: "ADDED",
          rationale: String(formData.get("rationale") ?? "").slice(0, 500) || null,
        },
        update: {
          action: "ADDED",
          rationale: String(formData.get("rationale") ?? "").slice(0, 500) || null,
          createdAt: new Date(),
        },
      }),
    ]);

    await recordProductEvent("recommendation_added", {
      lexemeId,
      aiReasonCode: String(formData.get("aiReasonCode") ?? "") || null,
      shownPosition: Number(formData.get("position") ?? 0) || null,
    });
    revalidatePath("/recommendations");
    revalidatePath("/vocabulary");
    return { status: "success", message: "Added to vocabulary." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not add recommendation.",
    };
  }
}

export async function dismissRecommendation(
  _previous: RecommendationActionState,
  formData: FormData,
): Promise<RecommendationActionState> {
  const lexemeId = String(formData.get("lexemeId") ?? "");
  if (!lexemeId) return { status: "error", message: "Recommendation is missing." };

  try {
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    await db.recommendationFeedback.upsert({
      where: { userCourseId_lexemeId: { userCourseId: course.id, lexemeId } },
      create: {
        userId: user.id,
        userCourseId: course.id,
        lexemeId,
        action: "DISMISSED",
        rationale: String(formData.get("rationale") ?? "").slice(0, 500) || null,
      },
      update: {
        action: "DISMISSED",
        rationale: String(formData.get("rationale") ?? "").slice(0, 500) || null,
        createdAt: new Date(),
      },
    });
    await recordProductEvent("recommendation_dismissed", {
      lexemeId,
      aiReasonCode: String(formData.get("aiReasonCode") ?? "") || null,
      shownPosition: Number(formData.get("position") ?? 0) || null,
    });
    revalidatePath("/recommendations");
    return { status: "success", message: "Recommendation dismissed." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not dismiss recommendation.",
    };
  }
}

export async function refreshSemanticRecommendations(
  _previous: RecommendationActionState,
): Promise<RecommendationActionState> {
  try {
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    await prepareRecommendationEmbeddings(user.id, course.id);
    revalidatePath("/recommendations");
    return { status: "success", message: "Semantic ranking refreshed." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not refresh semantic ranking.",
    };
  }
}
