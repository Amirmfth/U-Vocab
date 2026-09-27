import {
  CefrLevel,
  GrammarCategory,
  GrammarRelationType,
} from "@prisma/client";
import { db } from "../src/lib/db";
import {
  assertValidGrammarCurriculum,
  grammarCurriculum,
} from "../src/lib/grammar/curriculum";
import { syncDeclaredLevelGrammarAssumptions } from "../src/lib/grammar/progress";

async function seedGrammarCurriculum() {
  assertValidGrammarCurriculum();

  const ids = grammarCurriculum.map((concept) => concept.id);

  await db.$transaction(async (tx) => {
    for (const concept of grammarCurriculum) {
      await tx.grammarConcept.upsert({
        where: { id: concept.id },
        create: {
          id: concept.id,
          slug: concept.slug,
          title: concept.title,
          shortDescription: concept.shortDescription,
          category: concept.category as GrammarCategory,
          introducedAt: concept.introducedAt as CefrLevel,
          expectedBy: concept.expectedBy as CefrLevel | undefined,
          reinforcedAt: (concept.reinforcedAt ?? []) as CefrLevel[],
          order: concept.order,
          explanation: concept.explanation,
          rules: concept.rules,
          exceptions: concept.exceptions,
          examples: concept.examples,
          parentId: null,
        },
        update: {
          slug: concept.slug,
          title: concept.title,
          shortDescription: concept.shortDescription,
          category: concept.category as GrammarCategory,
          introducedAt: concept.introducedAt as CefrLevel,
          expectedBy: concept.expectedBy as CefrLevel | undefined,
          reinforcedAt: (concept.reinforcedAt ?? []) as CefrLevel[],
          order: concept.order,
          explanation: concept.explanation,
          rules: concept.rules,
          exceptions: concept.exceptions,
          examples: concept.examples,
          active: true,
        },
      });
    }

    await tx.grammarConcept.updateMany({
      where: {
        id: { notIn: ids },
        language: "de",
      },
      data: { active: false },
    });

    await tx.grammarPrerequisite.deleteMany({
      where: { conceptId: { in: ids } },
    });
    await tx.grammarConceptRelation.deleteMany({
      where: { sourceId: { in: ids } },
    });

    for (const concept of grammarCurriculum) {
      await tx.grammarConcept.update({
        where: { id: concept.id },
        data: { parentId: concept.parentId ?? null },
      });

      for (const prerequisiteId of concept.prerequisites ?? []) {
        await tx.grammarPrerequisite.create({
          data: {
            conceptId: concept.id,
            prerequisiteId,
          },
        });
      }

      for (const relation of concept.related ?? []) {
        await tx.grammarConceptRelation.create({
          data: {
            sourceId: concept.id,
            targetId: relation.targetId,
            type: (relation.type ?? "RELATED") as GrammarRelationType,
          },
        });
      }
    }
  });

  const users = await db.user.findMany({
    select: { id: true, currentLevel: true },
  });

  for (const user of users) {
    await syncDeclaredLevelGrammarAssumptions(user.id, user.currentLevel);
  }

  console.log(
    `Seeded ${grammarCurriculum.length} canonical German grammar concepts and synchronized ${users.length} learner profile(s).`,
  );
}

seedGrammarCurriculum()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
