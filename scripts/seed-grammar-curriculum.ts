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

  const prismaCategories = new Set<string>(Object.values(GrammarCategory));
  const missingCategories = [...new Set(grammarCurriculum.map((concept) => concept.category))]
    .filter((category) => !prismaCategories.has(category));
  if (missingCategories.length > 0) {
    throw new Error(
      `Grammar categories missing from the Prisma client: ${missingCategories.join(", ")}. Run the database migration and prisma generate before seeding.`,
    );
  }

  const ids = grammarCurriculum.map((concept) => concept.id);

  // Each upsert is independent. Keeping the entire curriculum in one interactive
  // transaction exceeds Prisma's default five-second timeout on remote databases.
  for (const concept of grammarCurriculum) {
    await db.grammarConcept.upsert({
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

  await db.grammarConcept.updateMany({
    where: {
      id: { notIn: ids },
      language: "de",
    },
    data: { active: false },
  });

  for (const concept of grammarCurriculum) {
    await db.grammarConcept.update({
      where: { id: concept.id },
      data: { parentId: concept.parentId ?? null },
    });
  }

  const prerequisites = grammarCurriculum.flatMap((concept) =>
    (concept.prerequisites ?? []).map((prerequisiteId) => ({
      conceptId: concept.id,
      prerequisiteId,
    })),
  );
  const relations = grammarCurriculum.flatMap((concept) =>
    (concept.related ?? []).map((relation) => ({
      sourceId: concept.id,
      targetId: relation.targetId,
      type: (relation.type ?? "RELATED") as GrammarRelationType,
    })),
  );

  // Replace graph edges together so a failed seed cannot leave a partial graph.
  await db.$transaction([
    db.grammarPrerequisite.deleteMany({ where: { conceptId: { in: ids } } }),
    db.grammarConceptRelation.deleteMany({ where: { sourceId: { in: ids } } }),
    db.grammarPrerequisite.createMany({ data: prerequisites }),
    db.grammarConceptRelation.createMany({ data: relations }),
  ]);

  const courses = await db.userCourse.findMany({
    where: { targetLanguage: "GERMAN", status: "ACTIVE" },
    select: {
      id: true,
      userId: true,
      currentLevel: true,
      targetLanguage: true,
    },
  });

  for (const course of courses) {
    await syncDeclaredLevelGrammarAssumptions({
      userId: course.userId,
      userCourseId: course.id,
      currentLevel: course.currentLevel,
      targetLanguage: course.targetLanguage,
    });
  }

  console.log(
    `Seeded ${grammarCurriculum.length} canonical German grammar concepts and synchronized ${courses.length} learner profile(s).`,
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
