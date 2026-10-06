import {
  CefrLevel,
  GrammarCategory,
  GrammarRelationType,
  TargetLanguage,
} from "@prisma/client";
import { db } from "../src/lib/db";
import {
  assertValidGrammarCurriculum,
  grammarCurriculum,
  type GrammarCurriculumConcept,
} from "../src/lib/grammar/curriculum";
import {
  assertValidFrenchGrammarCurriculum,
  frenchGrammarCurriculum,
} from "../src/lib/grammar/french-curriculum";
import { syncDeclaredLevelGrammarAssumptions } from "../src/lib/grammar/progress";
import { targetLanguageConfig } from "../src/lib/languages";

async function seedLanguageCurriculum(input: {
  targetLanguage: TargetLanguage;
  concepts: GrammarCurriculumConcept[];
  validate: () => void;
}) {
  input.validate();
  const language = targetLanguageConfig(input.targetLanguage);
  const prismaCategories = new Set<string>(Object.values(GrammarCategory));
  const missingCategories = [...new Set(input.concepts.map((concept) => concept.category))]
    .filter((category) => !prismaCategories.has(category));
  if (missingCategories.length > 0) {
    throw new Error(
      `Grammar categories missing from the Prisma client: ${missingCategories.join(", ")}. Run the database migration and prisma generate before seeding.`,
    );
  }

  const ids = input.concepts.map((concept) => concept.id);

  for (const concept of input.concepts) {
    await db.grammarConcept.upsert({
      where: { id: concept.id },
      create: {
        id: concept.id,
        slug: concept.slug,
        language: language.code,
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
        language: language.code,
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
      language: language.code,
    },
    data: { active: false },
  });

  for (const concept of input.concepts) {
    await db.grammarConcept.update({
      where: { id: concept.id },
      data: { parentId: concept.parentId ?? null },
    });
  }

  const prerequisites = input.concepts.flatMap((concept) =>
    (concept.prerequisites ?? []).map((prerequisiteId) => ({
      conceptId: concept.id,
      prerequisiteId,
    })),
  );
  const relations = input.concepts.flatMap((concept) =>
    (concept.related ?? []).map((relation) => ({
      sourceId: concept.id,
      targetId: relation.targetId,
      type: (relation.type ?? "RELATED") as GrammarRelationType,
    })),
  );

  await db.$transaction([
    db.grammarPrerequisite.deleteMany({ where: { conceptId: { in: ids } } }),
    db.grammarConceptRelation.deleteMany({ where: { sourceId: { in: ids } } }),
    ...(prerequisites.length ? [db.grammarPrerequisite.createMany({ data: prerequisites })] : []),
    ...(relations.length ? [db.grammarConceptRelation.createMany({ data: relations })] : []),
  ]);

  const courses = await db.userCourse.findMany({
    where: { targetLanguage: input.targetLanguage, status: "ACTIVE" },
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
    `Seeded ${input.concepts.length} canonical ${language.label} grammar concepts and synchronized ${courses.length} learner profile(s).`,
  );
}

async function seedGrammarCurriculum() {
  await seedLanguageCurriculum({
    targetLanguage: "GERMAN",
    concepts: grammarCurriculum,
    validate: assertValidGrammarCurriculum,
  });
  await seedLanguageCurriculum({
    targetLanguage: "FRENCH",
    concepts: frenchGrammarCurriculum,
    validate: assertValidFrenchGrammarCurriculum,
  });
}

seedGrammarCurriculum()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
