import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getReviewQueueData } from "@/lib/review-queue";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const excludeIds = new URL(request.url).searchParams.getAll("exclude");
  const queue = await getReviewQueueData({
    userId: user.id,
    preferredTranslation: user.preferredTranslation,
    excludeIds,
  });

  return NextResponse.json(queue, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
