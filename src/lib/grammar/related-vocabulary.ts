import type { GrammarCategory } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Returns only explicit lexeme ↔ grammar relationships. Category is retained
 * in the signature for compatibility with the concept page while #82 removes
 * the old part-of-speech guessing behavior.
 */
export async function getVocabularyForGrammarConcept(
  userId: string,
  _category: GrammarCategory,
  grammarConceptId?: string,
) {
  if (!grammarConceptId) return [];

  const links = await db.lexemeGrammarConcept.findMany({
    where: {
      grammarConceptId,
      confidence: { gte: 0.65 },
      lexeme: { userStates: { some: { userId } } },
    },
    include: {
      lexeme: {
        select: {
          id: true,
          lemma: true,
          article: true,
          partOfSpeech: true,
          patterns: { take: 2, select: { pattern: true } },
          userStates: {
            where: { userId },
            take: 1,
            select: {
              id: true,
              state: true,
              production: true,
              contextualUsage: true,
            },
          },
        },
      },
      lexicalPattern: { select: { pattern: true } },
    },
    orderBy: [{ confidence: "desc" }, { createdAt: "asc" }],
    take: 12,
  });

  return links
    .map((link) => ({
      id: link.lexeme.userStates[0]?.id ?? link.id,
      relationType: link.relationType,
      note: link.note,
      pattern: link.lexicalPattern?.pattern ?? null,
      lexeme: link.lexeme,
    }))
    .sort((a, b) => {
      const aState = a.lexeme.userStates[0];
      const bState = b.lexeme.userStates[0];
      return (
        (aState?.contextualUsage ?? 1) - (bState?.contextualUsage ?? 1) ||
        (aState?.production ?? 1) - (bState?.production ?? 1)
      );
    })
    .slice(0, 8);
}
