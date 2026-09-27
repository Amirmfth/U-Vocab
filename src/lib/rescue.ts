import { db } from "@/lib/db";
import { recentFailedRetrievals, rescueRisk } from "@/lib/progress";

export async function getRescueWords(userId: string, limit = 10, includeIds: string[] = []) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [items, attempts] = await Promise.all([
    db.userVocabulary.findMany({
      where: {
        userId,
        state: { notIn: ["NEW"] },
      },
      include: {
        lexeme: {
          include: {
            translations: true,
            patterns: true,
            examples: { take: 3 },
            mistakes: {
              where: { userId, resolvedAt: null },
              select: { type: true },
            },
          },
        },
      },
    }),
    db.attempt.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        userVocabularyId: { not: null },
      },
      select: { userVocabularyId: true, correct: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);

  const failureCounts = recentFailedRetrievals(attempts);

  return items
    .map((item) => {
      const recentFailures = failureCounts.get(item.id) ?? 0;
      const risk = rescueRisk({
        fsrsCard: item.fsrsCard,
        nextReviewAt: item.nextReviewAt,
        stability: item.stability,
        recentFailures,
      });
      return { ...item, risk, recentFailures };
    })
    .filter(
      (item) =>
        includeIds.includes(item.id) ||
        ((item.fsrsCard || item.recentFailures > 0) && item.risk.score >= 0.16),
    )
    .sort((a, b) => b.risk.score - a.risk.score)
    .slice(0, limit);
}
