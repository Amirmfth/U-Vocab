import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getReviewQueueData } from "@/lib/review-queue";

export async function GET() {
  const user = await getCurrentUser();
  const queue = await getReviewQueueData({
    userId: user.id,
    preferredTranslation: user.preferredTranslation,
  });

  return NextResponse.json(queue, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
