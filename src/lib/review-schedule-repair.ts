import { db } from "@/lib/db";
import { scheduleReview } from "@/lib/fsrs";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function repairImpossibleEasySchedules(userId: string, now = new Date()) {
  const candidates = await db.userVocabulary.findMany({
    where: {
      userId,
      nextReviewAt: { lte: now },
      reviews: { some: { rating: "EASY" } },
    },
    include: {
      reviews: {
        orderBy: { reviewedAt: "desc" },
        take: 1,
        select: { rating: true, reviewedAt: true, previousCard: true },
      },
    },
    orderBy: { nextReviewAt: "asc" },
    take: 24,
  });

  for (const item of candidates) {
    const latest = item.reviews[0];
    if (
      !latest ||
      latest.rating !== "EASY" ||
      !item.nextReviewAt ||
      item.nextReviewAt.getTime() - latest.reviewedAt.getTime() >= DAY_MS
    ) {
      continue;
    }

    const repaired = scheduleReview(
      latest.previousCard,
      "EASY",
      latest.reviewedAt,
    );

    await db.userVocabulary.update({
      where: { id: item.id },
      data: {
        fsrsCard: repaired.nextCard,
        stability: repaired.stability,
        difficulty: repaired.difficulty,
        retrievability: repaired.retrievability,
        nextReviewAt: repaired.due,
      },
    });
  }
}
