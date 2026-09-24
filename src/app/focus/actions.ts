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
    where: { userId: user.id, status: "ACTIVE", kind },
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
