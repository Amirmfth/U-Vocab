import type { CefrLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { CEFR_RANK } from "@/lib/grammar/levels";
import {
  buildGrammarExercise,
  grammarExerciseVariants,
  type GrammarLinkedLexeme,
} from "@/lib/exercises/grammar";
import {
  grammarPrerequisitesReady,
  GRAMMAR_STATUS_PRIORITY,
  orderGrammarVariants,
} from "@/lib/exercises/grammar-selection";

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
  const allowedLevels = (Object.keys(CEFR_RANK) as CefrLevel[]).filter(
    (level) => CEFR_RANK[level] <= CEFR_RANK[input.targetLevel],
  );

  const [concepts, allProgress, recentAttempts] = await Promise.all([
    db.grammarConcept.findMany({
      where: {
        active: true,
        language: "de",
        ...(input.slug ? { slug: input.slug } : {}),
        introducedAt: { in: allowedLevels },
      },
      include: {
        userProgress: { where: { userId: input.userId }, take: 1 },
        prerequisites: { select: { prerequisiteId: true } },
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
      },
      orderBy: { order: "asc" },
    }),
    db.userGrammarProgress.findMany({
      where: { userId: input.userId },
      select: { grammarConceptId: true, status: true },
    }),
    db.attempt.findMany({
      where: { userId: input.userId, grammarConceptId: { not: null } },
      select: { exerciseType: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const statusByConcept = new Map(
    allProgress.map((item) => [item.grammarConceptId, item.status]),
  );

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
      const prerequisitesReady = grammarPrerequisitesReady(
        concept.prerequisites.map((edge) => edge.prerequisiteId),
        statusByConcept,
        Boolean(input.slug),
      );
      return {
        concept,
        progress,
        status,
        link,
        variants,
        mistakeWeight,
        levelDistance,
        prerequisitesReady,
      };
    })
    .filter((item) => item.variants.length > 0 && item.prerequisitesReady)
    .sort((a, b) =>
      GRAMMAR_STATUS_PRIORITY[a.status] - GRAMMAR_STATUS_PRIORITY[b.status] ||
      b.mistakeWeight - a.mistakeWeight ||
      a.levelDistance - b.levelDistance ||
      a.concept.order - b.concept.order,
    );

  const userVocabularyByLexeme = new Map(
    (
      await db.userVocabulary.findMany({
        where: {
          userId: input.userId,
          lexemeId: {
            in: candidates
              .map((candidate) => candidate.link?.id)
              .filter((id): id is string => Boolean(id)),
          },
        },
        select: { id: true, lexemeId: true },
      })
    ).map((item) => [item.lexemeId, item.id]),
  );

  const exercises: Array<{
    id: string;
    userVocabularyId: string | null;
    grammarConceptId: string;
    grammarVariant: string;
    lemma: string;
    exercise: NonNullable<ReturnType<typeof buildGrammarExercise>>;
  }> = [];

  const recentTypes = recentAttempts
    .map((attempt) => attempt.exerciseType)
    .reverse();

  for (const candidate of candidates) {
    const orderedVariants = orderGrammarVariants(
      candidate.variants,
      candidate.progress
        ? { understanding: candidate.progress.understanding }
        : null,
    );

    for (const variant of orderedVariants) {
      if (exercises.length >= limit) break;
      if (recentTypes.slice(-2).includes(variant.type)) {
        const hasAlternative = orderedVariants.some(
          (other) =>
            other.key !== variant.key &&
            !recentTypes.slice(-2).includes(other.type),
        );
        if (hasAlternative) continue;
      }

      const exercise = buildGrammarExercise(
        candidate.concept.id,
        variant.key,
        candidate.link,
      );
      if (!exercise) continue;

      recentTypes.push(variant.type);
      exercises.push({
        id: "grammar:" + candidate.concept.id + ":" + variant.key,
        userVocabularyId: candidate.link
          ? userVocabularyByLexeme.get(candidate.link.id) ?? null
          : null,
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
