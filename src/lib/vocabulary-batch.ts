import { Prisma, type PrismaClient } from "@prisma/client";

export type VocabularyMasteryUpdate = {
  id: string;
  production?: number;
  contextualUsage?: number;
  recognition?: number;
  meaningRecall?: number;
};

export async function updateVocabularyMasteryBatch(
  db: PrismaClient,
  updates: VocabularyMasteryUpdate[],
) {
  if (!updates.length) return 0;

  const unique = Array.from(
    new Map(updates.map((update) => [update.id, update])).values(),
  );

  const values = Prisma.join(
    unique.map((update) =>
      Prisma.sql`(
        ${update.id},
        ${update.production ?? null},
        ${update.contextualUsage ?? null},
        ${update.recognition ?? null},
        ${update.meaningRecall ?? null}
      )`,
    ),
  );

  return db.$executeRaw(
    Prisma.sql`
      UPDATE "UserVocabulary" AS uv
      SET
        "production" = COALESCE(v.production, uv."production"),
        "contextualUsage" = COALESCE(v.contextual_usage, uv."contextualUsage"),
        "recognition" = COALESCE(v.recognition, uv."recognition"),
        "meaningRecall" = COALESCE(v.meaning_recall, uv."meaningRecall")
      FROM (
        VALUES ${values}
      ) AS v(id, production, contextual_usage, recognition, meaning_recall)
      WHERE uv.id = v.id
    `,
  );
}
