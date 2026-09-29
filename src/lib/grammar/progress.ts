import {
  CefrLevel,
  GrammarProgressSource,
  GrammarProgressStatus,
  TargetLanguage,
} from "@prisma/client";
import { db } from "@/lib/db";
import { isConceptAssumedForLevel } from "@/lib/grammar/levels";
import { targetLanguageConfig } from "@/lib/languages";

export async function syncDeclaredLevelGrammarAssumptions(input: {
  userId: string;
  userCourseId: string;
  currentLevel: CefrLevel;
  targetLanguage: TargetLanguage;
}) {
  const concepts = await db.grammarConcept.findMany({
    where: {
      active: true,
      language: targetLanguageConfig(input.targetLanguage).code,
    },
    select: {
      id: true,
      introducedAt: true,
      expectedBy: true,
    },
  });

  const assumedConceptIds = concepts
    .filter((concept) =>
      isConceptAssumedForLevel(
        input.currentLevel,
        concept.introducedAt,
        concept.expectedBy,
      ),
    )
    .map((concept) => concept.id);

  await db.$transaction(async (tx) => {
    await tx.userGrammarProgress.deleteMany({
      where: {
        userCourseId: input.userCourseId,
        source: GrammarProgressSource.DECLARED_LEVEL,
      },
    });

    if (assumedConceptIds.length === 0) return;

    await tx.userGrammarProgress.createMany({
      data: assumedConceptIds.map((grammarConceptId) => ({
        userId: input.userId,
        userCourseId: input.userCourseId,
        grammarConceptId,
        status: GrammarProgressStatus.ASSUMED,
        source: GrammarProgressSource.DECLARED_LEVEL,
        assumedFromLevel: input.currentLevel,
      })),
      skipDuplicates: true,
    });
  });
}
