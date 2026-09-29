"use server";

import { CefrLevel, TranslationLanguage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { db } from "@/lib/db";
import { isValidCefrLevel, targetLevelIsValid } from "@/lib/grammar/levels";
import { syncDeclaredLevelGrammarAssumptions } from "@/lib/grammar/progress";
import { targetLanguageConfig } from "@/lib/languages";

export type SettingsState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateTranslationPreference(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const value = String(formData.get("translation"));
  const currentLevel = String(formData.get("currentLevel"));
  const targetLevel = String(formData.get("targetLevel"));

  if (!["ENGLISH", "PERSIAN", "BOTH"].includes(value)) {
    return { status: "error", message: "Choose a valid translation language." };
  }
  if (!isValidCefrLevel(currentLevel)) {
    return { status: "error", message: "Choose a valid current level." };
  }
  if (!isValidCefrLevel(targetLevel)) {
    return { status: "error", message: "Choose a valid CEFR target level." };
  }

  const current = currentLevel as CefrLevel;
  const target = targetLevel as CefrLevel;
  if (!targetLevelIsValid(current, target)) {
    return {
      status: "error",
      message: "Target level must be the same as or higher than your current level.",
    };
  }

  try {
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    await db.userCourse.update({
      where: { id: course.id },
      data: {
        explanationLanguage: value as TranslationLanguage,
        currentLevel: current,
        targetLevel: target,
      },
    });

    await syncDeclaredLevelGrammarAssumptions({
      userId: user.id,
      userCourseId: course.id,
      currentLevel: current,
      targetLanguage: course.targetLanguage,
    });

    for (const path of ["/", "/vocabulary", "/review", "/practice", "/grammar", "/progress", "/settings"]) {
      revalidatePath(path);
    }

    return {
      status: "success",
      message: `${targetLanguageConfig(course.targetLanguage).label} learning preferences saved.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not save settings.",
    };
  }
}
