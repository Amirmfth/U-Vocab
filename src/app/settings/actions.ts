"use server";

import { CefrLevel, TranslationLanguage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { CEFR_RANK, syncDeclaredLevelGrammarAssumptions } from "@/lib/grammar/progress";

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

  const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
  if (!cefrLevels.includes(currentLevel as (typeof cefrLevels)[number])) {
    return { status: "error", message: "Choose a valid current German level." };
  }

  if (!cefrLevels.includes(targetLevel as (typeof cefrLevels)[number])) {
    return { status: "error", message: "Choose a valid CEFR target level." };
  }

  const current = currentLevel as CefrLevel;
  const target = targetLevel as CefrLevel;
  if (CEFR_RANK[target] < CEFR_RANK[current]) {
    return {
      status: "error",
      message: "Target level must be the same as or higher than your current level.",
    };
  }

  try {
    const user = await getCurrentUser();
    await db.user.update({
      where: { id: user.id },
      data: {
        preferredTranslation: value as TranslationLanguage,
        currentLevel: current,
        targetLevel: target,
      },
    });

    await syncDeclaredLevelGrammarAssumptions(user.id, current);

    revalidatePath("/");
    revalidatePath("/vocabulary");
    revalidatePath("/review");
    revalidatePath("/practice");
    revalidatePath("/settings");

    return { status: "success", message: "Learning preferences saved." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not save settings.",
    };
  }
}
