import type { GrammarCategory, PartOfSpeech } from "@prisma/client";
import { db } from "@/lib/db";

function relevantPartsOfSpeech(category: GrammarCategory): PartOfSpeech[] {
  switch (category) {
    case "VERBS":
    case "TENSES":
    case "PASSIVE":
    case "SUBJUNCTIVE":
    case "INFINITIVE_CONSTRUCTIONS":
      return ["VERB"];
    case "ARTICLES":
    case "CASES":
    case "NOUNS":
      return ["NOUN"];
    case "ADJECTIVES":
    case "COMPARISON":
      return ["ADJECTIVE"];
    case "PREPOSITIONS":
      return ["PREPOSITION", "VERB"];
    case "PRONOUNS":
      return ["PRONOUN"];
    case "CONJUNCTIONS":
    case "RELATIVE_CLAUSES":
      return ["CONJUNCTION", "PRONOUN"];
    default:
      return ["PHRASE", "VERB", "CONJUNCTION"];
  }
}

/**
 * Temporary pedagogical bridge until #82 adds explicit lexeme ↔ grammar links.
 * These are presented as vocabulary to reuse with a concept, not as claims
 * that the selected lexemes formally instantiate the rule.
 */
export async function getVocabularyForGrammarConcept(
  userId: string,
  category: GrammarCategory,
) {
  return db.userVocabulary.findMany({
    where: {
      userId,
      lexeme: { partOfSpeech: { in: relevantPartsOfSpeech(category) } },
    },
    include: {
      lexeme: {
        select: {
          id: true,
          lemma: true,
          article: true,
          partOfSpeech: true,
          patterns: { take: 2, select: { pattern: true } },
        },
      },
    },
    orderBy: [{ contextualUsage: "asc" }, { production: "asc" }],
    take: 8,
  });
}
