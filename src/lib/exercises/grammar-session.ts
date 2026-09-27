import type {
  CefrLevel,
  GrammarProgressStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { CEFR_RANK } from "@/lib/grammar/levels";
import {
  buildGrammarExercise,
  grammarExerciseVariants,
  type GrammarLinkedLexeme,
} from "@/lib/exercises/grammar";

const STATUS_RANK: Record<GrammarProgressStatus, number> = {
  NEEDS_ATTENTION: 0,
  LEARNING: 1,
  UNASSESSED: 2,
  ASSUMED: 3,
  STRONG: 4,
};

function linkedLexeme(link: {
  lexeme: { id: string; lemma: string; article: string | null };
  lexicalPattern: { pattern: string } | null;
} | null): GrammarLinkedLexeme | null {
  return link
    ? {
        id: link.lexeme.id,
        lemma: link.lexeme.lemma,
        article: link.lexeme.article,
        pattern: link.lexicalPattern?.pattern ?? null,
      }
    : null;
}

export async function buildGrammarPracticeSession(input: {
  userId: string;
  currentLevel: CefrLevel;
  targetLevel: CefrLevel;
  slug?: string | null;
  limit?: number;
}) {
  const limit = Math.min(8, Math.max(3, input.limit ?? 6));
  const concepts = await db.grammarConcept.findMany({
    where: {
      active: true,
      language: "de",
      ...(input.slug ? { slug: input.slug } : {}),
      introducedAt: { in: Object.keys(CEFR_RANK).filter(
        (level) => CEFR_RANK[level as CefrLevel] <= CEFR_RANK[input.targetLevel],
      ) as CefrLevel[] },
    },
    include: {
      userProgress: { where: { userId: input.userId }, take: 1 },
      lexemeLinks: {
        where: { lexeme: { userStates: { some: { userId: input.userId } } } },
        include: {
          lexeme: { select: { id: true, lemma: true, article: true } },
          lexicalPattern: { select: { pattern: true } },
        },
        orderBy: [{ confidence: "desc" }, { createdAt: "asc" }],
        take: 8,
      },
      mistakes: {
        where: { userId: input.userId, resolvedAt: null },
        select: { occurrences: true, lastOccurredAt: true },
        orderBy: { lastOccurredAt: "desc" },
        take: 10,
      },
      attempts: {
        where: { userId: input.userId },
        select: { exerciseType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { order: "asc" },
  });

  const candidates = concepts
    .map((concept) => {
      const progress = concept.userProgress[0];
      const status = progress?.status ?? "UNASSESSED";
      const link = linkedLexeme(concept.lexemeLinks[0] ?? null);
      const variants = grammarExerciseVariants(concept.id, link);
      const mistakeWeight = concept.mistakes.reduce(
        (sum, mistake) => sum + mistake.occurrences,
        0,
      );
      const levelDistance = Math.abs(
        CEFR_RANK[concept.introducedAt] - CEFR_RANK[input.currentLevel],
      );
      return { concept, progress, status, link, variants, mistakeWeight, levelDistance };
    })
    .filter((item) => item.variants.length > 0)
    .sort((a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      b.mistakeWeight - a.mistakeWeight ||
      a.levelDistance - b.levelDistance ||
      a.concept.order - b.concept.order,
    );

  const exercises: Array<{
    id: string;
    userVocabularyId: string | null;
    grammarConceptId: string;
    grammarVariant: string;
    lemma: string;
    exercise: NonNullable<ReturnType<typeof buildGrammarExercise>>;
  }> = [];
  const recentTypes: string[] = [];

  for (const candidate of candidates) {
    for (const variant of candidate.variants) {
      if (exercises.length >= limit) break;
      if (recentTypes.slice(-2).includes(variant.type)) continue;
      if (
        candidate.progress &&
        candidate.progress.understanding < 0.5 &&
        variant.dimension !== "UNDERSTANDING" &&
        candidate.variants.some((item) => item.dimension === "UNDERSTANDING")
      ) {
        continue;
      }
      const exercise = buildGrammarExercise(
        candidate.concept.id,
        variant.key,
        candidate.link,
      );
      if (!exercise) continue;
      recentTypes.push(variant.type);
      const linkedUserVocabulary = candidate.link
        ? await db.userVocabulary.findUnique({
            where: {
              userId_lexemeId: {
                userId: input.userId,
                lexemeId: candidate.link.id,
              },
            },
            select: { id: true },
          })
        : null;
      exercises.push({
        id: "grammar:" + candidate.concept.id + ":" + variant.key,
        userVocabularyId: linkedUserVocabulary?.id ?? null,
        grammarConceptId: candidate.concept.id,
        grammarVariant: variant.key,
        lemma: candidate.concept.title,
        exercise,
      });
    }
    if (exercises.length >= limit) break;
  }

  return exercises;
}
