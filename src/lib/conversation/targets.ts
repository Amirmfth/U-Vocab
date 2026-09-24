import { db } from "@/lib/db";

export async function selectConversationTargets(input: {
  userId: string;
  collectionId?: string | null;
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

  if (input.collectionId) {
    const pack = await db.topicPack.findFirst({
      where: { id: input.collectionId, userId: input.userId },
      include: {
        items: {
          include: {
            lexeme: { include: { patterns: true } },
          },
          orderBy: [{ usefulness: "desc" }, { position: "asc" }],
        },
      },
    });

    for (const item of pack?.items ?? []) {
      selected.set(item.lexemeId, {
        id: item.lexemeId,
        lemma: item.lexeme.lemma,
        article: item.lexeme.article,
        partOfSpeech: item.lexeme.partOfSpeech,
        patterns: item.lexeme.patterns.map((pattern) => pattern.pattern),
      });
      if (selected.size >= limit) return Array.from(selected.values());
    }
  }


  const activeSession = await db.learningSession.findFirst({
    where: { userId: input.userId, status: "ACTIVE" },
    include: {
      items: {
        where: { lexemeId: { not: null } },
        include: {
          lexeme: { include: { patterns: true } },
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { lastActiveAt: "desc" },
  });

  for (const item of activeSession?.items ?? []) {
    if (!item.lexemeId || !item.lexeme) continue;
    selected.set(item.lexemeId, {
      id: item.lexemeId,
      lemma: item.lexeme.lemma,
      article: item.lexeme.article,
      partOfSpeech: item.lexeme.partOfSpeech,
      patterns: item.lexeme.patterns.map((pattern) => pattern.pattern),
    });
    if (selected.size >= limit) return Array.from(selected.values());
  }

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
