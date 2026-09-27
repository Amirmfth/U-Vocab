import {
  CefrLevel,
  GrammarProgressSource,
  GrammarProgressStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { isConceptAssumedForLevel } from "@/lib/grammar/levels";

/**
 * Rebuilds only grammar state inferred from the user's declared CEFR level.
 *
 * Future evidence-backed/manual progress is intentionally untouched. This is
 * what makes it safe for a learner to change their declared current level
 * without erasing demonstrated knowledge or weaknesses.
 */
export async function syncDeclaredLevelGrammarAssumptions(
  userId: string,
  currentLevel: CefrLevel,
) {
  const concepts = await db.grammarConcept.findMany({
    where: { active: true, language: "de" },
    select: {
      id: true,
      introducedAt: true,
      expectedBy: true,
    },
  });

  const assumedConceptIds = concepts
    .filter((concept) =>
      isConceptAssumedForLevel(
        currentLevel,
        concept.introducedAt,
        concept.expectedBy,
      ),
    )
    .map((concept) => concept.id);

  await db.$transaction(async (tx) => {
    await tx.userGrammarProgress.deleteMany({
      where: {
        userId,
        source: GrammarProgressSource.DECLARED_LEVEL,
      },
    });

    if (assumedConceptIds.length === 0) return;

    await tx.userGrammarProgress.createMany({
      data: assumedConceptIds.map((grammarConceptId) => ({
        userId,
        grammarConceptId,
        status: GrammarProgressStatus.ASSUMED,
        source: GrammarProgressSource.DECLARED_LEVEL,
        assumedFromLevel: currentLevel,
      })),
      skipDuplicates: true,
    });
  });
}
