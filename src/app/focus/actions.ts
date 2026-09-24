"use server";

import type { SessionKind } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { buildSessionPlan } from "@/lib/focus-planner";

export async function createFocusSession(formData: FormData) {
  const kind = String(formData.get("kind") ?? "FOCUS") as SessionKind;
  const requested = Number(formData.get("minutes") ?? 60);
  const minutes =
    kind === "DAILY_CHALLENGE"
      ? 12
      : [15, 30, 45, 60].includes(requested)
        ? requested
        : 60;

  const user = await getCurrentUser();

  const active = await db.learningSession.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { lastActiveAt: "desc" },
  });

  if (active) {
    redirect("/focus/" + active.id);
  }

  const plan = await buildSessionPlan(db, {
    userId: user.id,
    kind,
    minutes,
  });

  if (!plan.length) redirect("/vocabulary/new");

  const session = await db.learningSession.create({
    data: {
      userId: user.id,
      kind,
      plannedMinutes: minutes,
      items: {
        create: plan.map((item, position) => ({
          ...item,
          position,
        })),
      },
    },
  });

  redirect("/focus/" + session.id);
}

export async function completeFocusStep(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const user = await getCurrentUser();

  const session = await db.learningSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!session) throw new Error("Session not found.");

  const item = session.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error("Session item not found.");

  const nextStep = Math.min(item.position + 1, session.items.length);
  const complete = nextStep >= session.items.length;
  const now = new Date();

  let summary:
    | {
        reviews: number;
        attempts: number;
        correctAttempts: number;
        durationMs: number;
      }
    | undefined;

  if (complete) {
    const [attemptGroups, reviews] = await Promise.all([
      db.attempt.groupBy({
        by: ["correct"],
        where: {
          userId: user.id,
          createdAt: { gte: session.startedAt, lte: now },
        },
        _count: { _all: true },
        _sum: { durationMs: true },
      }),
      db.review.count({
        where: {
          userVocabulary: { userId: user.id },
          reviewedAt: { gte: session.startedAt, lte: now },
        },
      }),
    ]);

    summary = {
      reviews,
      attempts: attemptGroups.reduce(
        (sum, group) => sum + group._count._all,
        0,
      ),
      correctAttempts:
        attemptGroups.find((group) => group.correct)?._count._all ?? 0,
      durationMs: attemptGroups.reduce(
        (sum, group) => sum + (group._sum.durationMs ?? 0),
        0,
      ),
    };
  }

  await db.$transaction([
    db.learningSessionItem.update({
      where: { id: item.id },
      data: { completedAt: item.completedAt ?? now },
    }),
    db.learningSession.update({
      where: { id: session.id },
      data: {
        currentStep: nextStep,
        lastActiveAt: now,
        status: complete ? "COMPLETED" : "ACTIVE",
        completedAt: complete ? now : null,
        summary: summary ?? undefined,
      },
    }),
  ]);

  revalidatePath("/focus");
  redirect("/focus/" + session.id);
}

export async function abandonFocusSession(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const user = await getCurrentUser();

  await db.learningSession.updateMany({
    where: { id: sessionId, userId: user.id, status: "ACTIVE" },
    data: {
      status: "ABANDONED",
      lastActiveAt: new Date(),
    },
  });

  revalidatePath("/focus");
  redirect("/focus");
}
