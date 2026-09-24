import { db } from "@/lib/db";
import { rescueRisk } from "@/lib/progress";

export async function getRescueWords(userId: string, limit = 10) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [items, failures] = await Promise.all([
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
        correct: false,
        createdAt: { gte: since },
        userVocabularyId: { not: null },
      },
      select: { userVocabularyId: true },
    }),
  ]);

  const failureCounts = new Map<string, number>();
  for (const attempt of failures) {
    if (!attempt.userVocabularyId) continue;
    failureCounts.set(
      attempt.userVocabularyId,
      (failureCounts.get(attempt.userVocabularyId) ?? 0) + 1,
    );
  }

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
        (item.fsrsCard || item.recentFailures > 0) &&
        (item.risk.score >= 0.16 || item.risk.reasons.length > 0),
    )
    .sort((a, b) => b.risk.score - a.risk.score)
    .slice(0, limit);
}
