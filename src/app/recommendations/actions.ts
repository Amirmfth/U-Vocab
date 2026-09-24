"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { prepareRecommendationEmbeddings } from "@/lib/recommendations";
import { revalidateUserDomains } from "@/lib/cache-tags";

export type RecommendationActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function addRecommendation(
  _previous: RecommendationActionState,
  formData: FormData,
): Promise<RecommendationActionState> {
  const lexemeId = String(formData.get("lexemeId") ?? "");
  const rationale = String(formData.get("rationale") ?? "") || null;

  try {
    const user = await getCurrentUser();
    const lexeme = await db.lexeme.findUnique({
      where: { id: lexemeId },
      select: { id: true },
    });
    if (!lexeme) return { status: "error", message: "Recommendation not found." };

    await db.$transaction([
      db.userVocabulary.upsert({
        where: { userId_lexemeId: { userId: user.id, lexemeId } },
        create: {
          userId: user.id,
          lexemeId,
          nextReviewAt: new Date(),
        },
        update: {},
      }),
      db.recommendationFeedback.upsert({
        where: { userId_lexemeId: { userId: user.id, lexemeId } },
        create: {
          userId: user.id,
          lexemeId,
          action: "ADDED",
          rationale,
        },
        update: {
          action: "ADDED",
          rationale,
          createdAt: new Date(),
        },
      }),
    ]);

    revalidateUserDomains(
      user.id,
      ["home", "vocabulary", "review", "recommendations"],
      [lexemeId],
    );
    revalidatePath("/recommendations");
    revalidatePath("/vocabulary");

    return { status: "success", message: "Added to your vocabulary." };
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
  const rationale = String(formData.get("rationale") ?? "") || null;

  try {
    const user = await getCurrentUser();

    await db.recommendationFeedback.upsert({
      where: { userId_lexemeId: { userId: user.id, lexemeId } },
      create: {
        userId: user.id,
        lexemeId,
        action: "DISMISSED",
        rationale,
      },
      update: {
        action: "DISMISSED",
        rationale,
        createdAt: new Date(),
      },
    });

    revalidateUserDomains(user.id, ["recommendations"]);
    revalidatePath("/recommendations");
    return { status: "success", message: "Dismissed." };
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
    const user = await getCurrentUser();
    const count = await prepareRecommendationEmbeddings(user.id);
    revalidateUserDomains(user.id, ["recommendations"]);
    revalidatePath("/recommendations");

    return {
      status: "success",
      message: count
        ? "Indexed " + count + " lexical units for semantic ranking."
        : "Semantic index is already current.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not refresh semantic ranking.",
    };
  }
}
