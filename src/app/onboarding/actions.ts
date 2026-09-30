"use server";

import {
  CefrLevel,
  TargetLanguage,
  TranslationLanguage,
} from "@prisma/client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { CEFR_LEVELS, targetLevelIsValid } from "@/lib/grammar/levels";
import { syncDeclaredLevelGrammarAssumptions } from "@/lib/grammar/progress";
import { ENABLED_TARGET_LANGUAGES } from "@/lib/languages";
import {
  ONBOARDING_FIRST_ACTION,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_VERSION,
  normalizedOnboardingStep,
} from "@/lib/onboarding";
import { recordProductEvent } from "@/lib/product-events";
import {
  parseUiLocalePreference,
  UI_LOCALE_COOKIE,
} from "@/i18n/preference";

export type OnboardingActionResult =
  | { ok: true; step: number; destination?: string }
  | { ok: false; message: string };

async function persistStep(userId: string, step: number) {
  const normalized = normalizedOnboardingStep(step);
  await db.user.update({
    where: { id: userId },
    data: { onboardingStep: normalized },
  });
  return normalized;
}

export async function recordOnboardingStarted() {
  const user = await getCurrentUser();
  await recordProductEvent("onboarding_started", {
    version: ONBOARDING_VERSION,
    step: normalizedOnboardingStep(user.onboardingStep),
  });
}

export async function saveOnboardingLocale(
  value: string,
): Promise<OnboardingActionResult> {
  const user = await getCurrentUser();
  const preference = parseUiLocalePreference(value);
  if (!preference) return { ok: false, message: "Invalid locale." };

  await db.user.update({
    where: { id: user.id },
    data: {
      uiLocale: preference.dbLocale,
      onboardingStep: 2,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(UI_LOCALE_COOKIE, preference.cookieLocale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  await recordProductEvent("onboarding_step_completed", {
    version: ONBOARDING_VERSION,
    step: 1,
  });
  revalidatePath("/", "layout");
  return { ok: true, step: 2 };
}

export async function saveOnboardingCourse(
  value: string,
): Promise<OnboardingActionResult> {
  const user = await getCurrentUser();
  if (!ENABLED_TARGET_LANGUAGES.includes(value as TargetLanguage)) {
    return { ok: false, message: "Unsupported course." };
  }

  const targetLanguage = value as TargetLanguage;
  const course = await db.userCourse.upsert({
    where: {
      userId_targetLanguage: {
        userId: user.id,
        targetLanguage,
      },
    },
    create: {
      userId: user.id,
      targetLanguage,
      currentLevel: "A1",
      targetLevel: "B2",
      explanationLanguage: "ENGLISH",
      status: "ACTIVE",
    },
    update: { status: "ACTIVE" },
  });

  await db.user.update({
    where: { id: user.id },
    data: {
      activeCourseId: course.id,
      onboardingStep: 3,
    },
  });

  await recordProductEvent("onboarding_step_completed", {
    version: ONBOARDING_VERSION,
    step: 2,
  });
  return { ok: true, step: 3 };
}

export async function saveOnboardingCurrentLevel(
  value: string,
): Promise<OnboardingActionResult> {
  if (!CEFR_LEVELS.includes(value as CefrLevel)) {
    return { ok: false, message: "Invalid CEFR level." };
  }
  const user = await getCurrentUser();
  const course = await getCurrentCourse();
  const currentLevel = value as CefrLevel;
  const targetLevel = targetLevelIsValid(currentLevel, course.targetLevel)
    ? course.targetLevel
    : currentLevel;

  await db.userCourse.update({
    where: { id: course.id },
    data: { currentLevel, targetLevel },
  });
  await persistStep(user.id, 4);
  await recordProductEvent("onboarding_step_completed", {
    version: ONBOARDING_VERSION,
    step: 3,
  });
  return { ok: true, step: 4 };
}

export async function saveOnboardingTargetLevel(
  value: string,
): Promise<OnboardingActionResult> {
  if (!CEFR_LEVELS.includes(value as CefrLevel)) {
    return { ok: false, message: "Invalid CEFR level." };
  }
  const user = await getCurrentUser();
  const course = await getCurrentCourse();
  const targetLevel = value as CefrLevel;
  if (!targetLevelIsValid(course.currentLevel, targetLevel)) {
    return { ok: false, message: "Target level must not be below current level." };
  }

  await db.userCourse.update({
    where: { id: course.id },
    data: { targetLevel },
  });
  await persistStep(user.id, 5);
  await recordProductEvent("onboarding_step_completed", {
    version: ONBOARDING_VERSION,
    step: 4,
  });
  return { ok: true, step: 5 };
}

export async function saveOnboardingExplanation(
  value: string,
): Promise<OnboardingActionResult> {
  if (!["ENGLISH", "PERSIAN", "BOTH"].includes(value)) {
    return { ok: false, message: "Invalid explanation language." };
  }
  const user = await getCurrentUser();
  const course = await getCurrentCourse();

  await db.userCourse.update({
    where: { id: course.id },
    data: { explanationLanguage: value as TranslationLanguage },
  });
  await persistStep(user.id, 6);
  await recordProductEvent("onboarding_step_completed", {
    version: ONBOARDING_VERSION,
    step: 5,
  });
  return { ok: true, step: 6 };
}

export async function finishCoreLoopStep(): Promise<OnboardingActionResult> {
  const user = await getCurrentUser();
  await persistStep(user.id, 7);
  await recordProductEvent("onboarding_step_completed", {
    version: ONBOARDING_VERSION,
    step: 6,
  });
  return { ok: true, step: 7 };
}

export async function setOnboardingStep(
  step: number,
): Promise<OnboardingActionResult> {
  const user = await getCurrentUser();
  const next = await persistStep(user.id, step);
  return { ok: true, step: next };
}

export async function completeOnboarding(): Promise<OnboardingActionResult> {
  const user = await getCurrentUser();
  const course = await getCurrentCourse();

  await syncDeclaredLevelGrammarAssumptions({
    userId: user.id,
    userCourseId: course.id,
    currentLevel: course.currentLevel,
    targetLanguage: course.targetLanguage,
  });

  await db.user.update({
    where: { id: user.id },
    data: {
      onboardingCompletedAt: new Date(),
      onboardingVersion: ONBOARDING_VERSION,
      onboardingStep: ONBOARDING_STEP_COUNT,
    },
  });

  await recordProductEvent("onboarding_step_completed", {
    version: ONBOARDING_VERSION,
    step: 7,
  });
  await recordProductEvent("onboarding_completed", {
    version: ONBOARDING_VERSION,
  });

  revalidatePath("/", "layout");
  return {
    ok: true,
    step: ONBOARDING_STEP_COUNT,
    destination: ONBOARDING_FIRST_ACTION,
  };
}
