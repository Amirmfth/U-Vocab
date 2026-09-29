import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { getReviewQueueData } from "@/lib/review-queue";
import { isUnauthorizedError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    const excludeIds = new URL(request.url).searchParams.getAll("exclude");
    const queue = await getReviewQueueData({
      userId: user.id,
      userCourseId: course.id,
      preferredTranslation: course.explanationLanguage,
      excludeIds,
    });

    return NextResponse.json(queue, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    console.error("Could not load review queue", error);
    return NextResponse.json(
      { error: "Could not load review queue." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
