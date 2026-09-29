"use server";

import { CefrLevel, TranslationLanguage } from "@prisma/client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { db } from "@/lib/db";
import { isValidCefrLevel, targetLevelIsValid } from "@/lib/grammar/levels";
import { syncDeclaredLevelGrammarAssumptions } from "@/lib/grammar/progress";
import { targetLanguageConfig } from "@/lib/languages";
import { createTranslator } from "@/i18n/core";
import { getServerTranslator } from "@/i18n/server";
import {
  parseUiLocalePreference,
  UI_LOCALE_COOKIE,
} from "@/i18n/preference";

export type SettingsState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateUiLocale(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await getCurrentUser();
  const current = await getServerTranslator(user);
  const value = String(formData.get("uiLocale"));

  const preference = parseUiLocalePreference(value);
  if (!preference) {
    return { status: "error", message: current.t("settings.chooseUiLanguage") };
  }

  const nextT = createTranslator(preference.locale);

  try {
    await db.user.update({
      where: { id: user.id },
      data: { uiLocale: preference.dbLocale },
    });

    const cookieStore = await cookies();
    cookieStore.set(UI_LOCALE_COOKIE, preference.cookieLocale, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/", "layout");

    return {
      status: "success",
      message: nextT("settings.interfaceSaved"),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : current.t("settings.interfaceSaveError"),
    };
  }
}

export async function updateTranslationPreference(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await getCurrentUser();
  const { t } = await getServerTranslator(user);
  const value = String(formData.get("translation"));
  const currentLevel = String(formData.get("currentLevel"));
  const targetLevel = String(formData.get("targetLevel"));

  if (!["ENGLISH", "PERSIAN", "BOTH"].includes(value)) {
    return { status: "error", message: t("settings.chooseTranslation") };
  }
  if (!isValidCefrLevel(currentLevel)) {
    return { status: "error", message: t("settings.chooseCurrentLevel") };
  }
  if (!isValidCefrLevel(targetLevel)) {
    return { status: "error", message: t("settings.chooseTargetLevel") };
  }

  const current = currentLevel as CefrLevel;
  const target = targetLevel as CefrLevel;
  if (!targetLevelIsValid(current, target)) {
    return {
      status: "error",
      message: t("settings.targetBelowCurrent"),
    };
  }

  try {
    const course = await getCurrentCourse();
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

    const targetLabel =
      course.targetLanguage === "GERMAN"
        ? t("common.german")
        : targetLanguageConfig(course.targetLanguage).label;

    return {
      status: "success",
      message: t("settings.coursePreferencesSaved", { language: targetLabel }),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : t("settings.preferencesSaveError"),
    };
  }
}
