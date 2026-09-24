"use server";

import { TranslationLanguage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export type SettingsState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateTranslationPreference(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const value = String(formData.get("translation"));
  const targetLevel = String(formData.get("targetLevel"));

  if (!["ENGLISH", "PERSIAN", "BOTH"].includes(value)) {
    return { status: "error", message: "Choose a valid translation language." };
  }

  if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(targetLevel)) {
    return { status: "error", message: "Choose a valid CEFR target level." };
  }

  try {
    const user = await getCurrentUser();
    await db.user.update({
      where: { id: user.id },
      data: {
        preferredTranslation: value as TranslationLanguage,
        targetLevel,
      },
    });

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
