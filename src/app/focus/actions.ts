"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { buildSessionPlan } from "@/lib/focus-planner";
import { planDailySession } from "@/lib/ai/decisions/session-planner";
import { localDateKey } from "@/lib/progress";

const ALLOWED_MINUTES = new Set([5, 10, 15, 20]);

export async function createFocusSession(formData: FormData): Promise<never> {
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const requested = Number(formData.get("minutes") ?? 15);
  const minutes = ALLOWED_MINUTES.has(requested) ? requested : 15;

  const [deterministicItems, dueCount, weakProductionCount, unresolvedMistakeCount] =
    await Promise.all([
      buildSessionPlan(db, {
        userId: user.id,
        userCourseId: course.id,
        targetLanguage: course.targetLanguage,
        kind: "FOCUS",
        minutes,
        currentLevel: course.currentLevel,
        targetLevel: course.targetLevel,
      }),
      db.userVocabulary.count({
        where: {
          userCourseId: course.id,
          OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: new Date() } }],
        },
      }),
      db.userVocabulary.count({
        where: { userCourseId: course.id, production: { lt: 0.5 } },
      }),
      db.mistake.count({
        where: { userCourseId: course.id, resolvedAt: null },
      }),
    ]);

  const planned = await planDailySession({
    userId: user.id,
    userCourseId: course.id,
    requestedMinutes: minutes,
    dueCount,
    weakProductionCount,
    unresolvedMistakeCount,
    currentLevel: course.currentLevel,
    targetLevel: course.targetLevel,
    deterministicItems,
    localDateKey: localDateKey(new Date(), user.timezone || "UTC"),
  });

  const session = await db.learningSession.create({
    data: {
      userId: user.id,
      userCourseId: course.id,
      kind: "FOCUS",
      plannedMinutes: minutes,
      summary: {
        planner: planned.usedAI ? "AI" : "DETERMINISTIC",
        fallback: planned.fallback,
        segmentCount: planned.items.length,
      },
      items: {
        create: planned.items.map((item, position) => ({
          activity: item.activity,
          lexemeId: item.lexemeId ?? null,
          title: item.title,
          description: item.description ?? null,
          href: item.href,
          position,
          plannedMinutes: item.plannedMinutes,
        })),
      },
    },
    select: { id: true },
  });

  redirect("/focus/" + session.id);
}

export async function completeFocusStep(formData: FormData): Promise<never> {
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const sessionId = String(formData.get("sessionId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  const session = await db.learningSession.findFirst({
    where: { id: sessionId, userId: user.id, userCourseId: course.id, status: "ACTIVE" },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!session) redirect("/focus");

  const item = session.items.find((entry) => entry.id === itemId);
  if (!item) redirect("/focus/" + session.id);

  await db.learningSessionItem.update({
    where: { id: item.id },
    data: { completedAt: new Date() },
  });

  const nextIndex = session.items.findIndex((entry) => entry.id === item.id) + 1;
  const complete = nextIndex >= session.items.length;
  await db.learningSession.update({
    where: { id: session.id },
    data: {
      currentStep: Math.min(nextIndex, session.items.length),
      lastActiveAt: new Date(),
      ...(complete ? { status: "COMPLETED", completedAt: new Date() } : {}),
    },
  });

  revalidatePath("/focus/" + session.id);
  redirect(complete ? "/focus" : "/focus/" + session.id);
}

export async function abandonFocusSession(formData: FormData): Promise<never> {
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const sessionId = String(formData.get("sessionId") ?? "");
  await db.learningSession.updateMany({
    where: { id: sessionId, userId: user.id, userCourseId: course.id, status: "ACTIVE" },
    data: { status: "ABANDONED", lastActiveAt: new Date() },
  });
  redirect("/focus");
}
