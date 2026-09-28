import { db } from "@/lib/db";

export async function selectConversationTargets(input: {
  userId: string;
  limit?: number;
}) {
  const limit = input.limit ?? 5;
  const selected = new Map<string, {
    id: string;
    lemma: string;
    article: string | null;
    partOfSpeech: string;
    patterns: string[];
  }>();

  const weak = await db.userVocabulary.findMany({
    where: { userId: input.userId },
    include: { lexeme: { include: { patterns: true } } },
    orderBy: [
      { production: "asc" },
      { contextualUsage: "asc" },
      { meaningRecall: "asc" },
      { addedAt: "asc" },
    ],
    take: Math.max(limit * 3, 15),
  });

  for (const item of weak) {
    selected.set(item.lexemeId, {
      id: item.lexemeId,
      lemma: item.lexeme.lemma,
      article: item.lexeme.article,
      partOfSpeech: item.lexeme.partOfSpeech,
      patterns: item.lexeme.patterns.map((pattern) => pattern.pattern),
    });
    if (selected.size >= limit) break;
  }

  return Array.from(selected.values());
}
