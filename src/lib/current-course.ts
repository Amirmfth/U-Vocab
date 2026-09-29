import { cache } from "react";
import type { User, UserCourse } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

const DEFAULT_COURSE = {
  targetLanguage: "GERMAN" as const,
  currentLevel: "A1" as const,
  targetLevel: "B2" as const,
  explanationLanguage: "ENGLISH" as const,
};

async function resolveCourseForUser(user: User): Promise<UserCourse> {
  if (user.activeCourseId) {
    const active = await db.userCourse.findFirst({
      where: {
        id: user.activeCourseId,
        userId: user.id,
        status: "ACTIVE",
      },
    });
    if (active) return active;
  }

  const existing = await db.userCourse.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    await db.user.update({
      where: { id: user.id },
      data: { activeCourseId: existing.id },
    });
    return existing;
  }

  const created = await db.userCourse.upsert({
    where: {
      userId_targetLanguage: {
        userId: user.id,
        targetLanguage: DEFAULT_COURSE.targetLanguage,
      },
    },
    create: {
      userId: user.id,
      ...DEFAULT_COURSE,
    },
    update: { status: "ACTIVE" },
  });

  await db.user.update({
    where: { id: user.id },
    data: { activeCourseId: created.id },
  });

  return created;
}

export const getCurrentCourse = cache(async function getCurrentCourse() {
  const user = await getCurrentUser();
  return resolveCourseForUser(user);
});

export async function requireOwnedCourse(courseId: string) {
  const user = await getCurrentUser();
  const course = await db.userCourse.findFirst({
    where: { id: courseId, userId: user.id },
  });
  if (!course) throw new Error("Course not found.");
  return course;
}
