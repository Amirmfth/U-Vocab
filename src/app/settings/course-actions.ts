"use server";

import type { TargetLanguage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getEntitlements } from "@/lib/entitlements/service";
import { ENABLED_TARGET_LANGUAGES, targetLanguageConfig } from "@/lib/languages";
import { syncDeclaredLevelGrammarAssumptions } from "@/lib/grammar/progress";

export async function switchCourseAction(formData: FormData) {
  const user = await getCurrentUser();
  const courseId = String(formData.get("courseId") ?? "");
  const course = await db.userCourse.findFirst({
    where: { id: courseId, userId: user.id, status: "ACTIVE" },
  });
  if (!course || !targetLanguageConfig(course.targetLanguage).enabled) return;

  await db.user.update({
    where: { id: user.id },
    data: { activeCourseId: course.id },
  });

  revalidatePath("/", "layout");
}

export async function createCourseAction(formData: FormData) {
  const user = await getCurrentUser();
  const rawLanguage = String(formData.get("targetLanguage") ?? "");
  if (!ENABLED_TARGET_LANGUAGES.includes(rawLanguage as TargetLanguage)) return;

  const targetLanguage = rawLanguage as TargetLanguage;
  const existing = await db.userCourse.findUnique({
    where: {
      userId_targetLanguage: {
        userId: user.id,
        targetLanguage,
      },
    },
  });

  if (existing) {
    await db.userCourse.update({
      where: { id: existing.id },
      data: { status: "ACTIVE" },
    });
    await db.user.update({
      where: { id: user.id },
      data: { activeCourseId: existing.id },
    });
    revalidatePath("/", "layout");
    return;
  }

  const courseCount = await db.userCourse.count({
    where: { userId: user.id, status: "ACTIVE" },
  });
  if (courseCount > 0) {
    const entitlements = await getEntitlements(user.id);
    if (!entitlements.config.features.multi_course) return;
  }

  const course = await db.userCourse.create({
    data: {
      userId: user.id,
      targetLanguage,
      currentLevel: "A1",
      targetLevel: "B2",
      explanationLanguage: "ENGLISH",
      status: "ACTIVE",
    },
  });

  await Promise.all([
    db.user.update({
      where: { id: user.id },
      data: { activeCourseId: course.id },
    }),
    syncDeclaredLevelGrammarAssumptions({
      userId: user.id,
      userCourseId: course.id,
      currentLevel: course.currentLevel,
      targetLanguage: course.targetLanguage,
    }),
  ]);

  revalidatePath("/", "layout");
}
