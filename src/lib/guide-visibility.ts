import { db } from "@/lib/db";

export async function shouldShowGuide(
  userId: string,
  guideId: string,
  version: number,
) {
  const state = await db.userGuideState.findUnique({
    where: { userId_guideId: { userId, guideId } },
    select: { version: true, dismissedAt: true },
  });

  return !state || state.version < version || !state.dismissedAt;
}
