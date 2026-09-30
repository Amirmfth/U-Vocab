"use server";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { recordProductEvent } from "@/lib/product-events";

export async function markGuideSeen(guideId: string, version: number) {
  const user = await getCurrentUser();
  await db.userGuideState.upsert({
    where: { userId_guideId: { userId: user.id, guideId } },
    create: {
      userId: user.id,
      guideId,
      version,
      seenAt: new Date(),
    },
    update: {
      version,
      seenAt: new Date(),
      ...(version > 1 ? { dismissedAt: null } : {}),
    },
  });
  await recordProductEvent("first_use_guide_seen", { guideId, version });
}

export async function dismissGuide(guideId: string, version: number) {
  const user = await getCurrentUser();
  await db.userGuideState.upsert({
    where: { userId_guideId: { userId: user.id, guideId } },
    create: {
      userId: user.id,
      guideId,
      version,
      seenAt: new Date(),
      dismissedAt: new Date(),
    },
    update: {
      version,
      seenAt: new Date(),
      dismissedAt: new Date(),
    },
  });
  await recordProductEvent("first_use_guide_dismissed", { guideId, version });
}
