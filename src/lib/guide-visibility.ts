import { db } from "@/lib/db";

export function guideStateShouldShow(
  state: { version: number; dismissedAt: Date | null } | null,
  version: number,
) {
  return !state || state.version < version || !state.dismissedAt;
}

export async function shouldShowGuide(
  userId: string,
  guideId: string,
  version: number,
) {
  const state = await db.userGuideState.findUnique({
    where: { userId_guideId: { userId, guideId } },
    select: { version: true, dismissedAt: true },
  });

  return guideStateShouldShow(state, version);
}
