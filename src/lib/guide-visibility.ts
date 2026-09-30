import { db } from "@/lib/db";
import { guideStateShouldShow } from "@/lib/first-use-guidance";

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
