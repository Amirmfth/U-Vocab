import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { isUnauthorizedError } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const dueCount = await db.userVocabulary.count({
      where: {
        userId: user.id,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: new Date() } }],
      },
    });
    return Response.json(
      { dueCount },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    console.error("Could not load review count", error);
    return Response.json(
      { error: "Could not load review count." },
      { status: 500 },
    );
  }
}
