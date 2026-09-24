import { Prisma, type PrismaClient } from "@prisma/client";

export type VocabularyMasteryUpdate = {
  id: string;
  production?: number;
  contextualUsage?: number;
  recognition?: number;
  meaningRecall?: number;
};

export async function updateVocabularyMasteryBatch(
  db: Pick<PrismaClient, "$executeRaw">,
  updates: VocabularyMasteryUpdate[],
) {
  if (!updates.length) return 0;

  const unique = Array.from(
    new Map(updates.map((update) => [update.id, update])).values(),
  );

  const values = Prisma.join(
    unique.map((update) =>
      Prisma.sql`(
        ${update.id}::text,
        ${update.production ?? null}::double precision,
        ${update.contextualUsage ?? null}::double precision,
        ${update.recognition ?? null}::double precision,
        ${update.meaningRecall ?? null}::double precision
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

export async function updateConversationTargetsBatch(
  db: Pick<PrismaClient, "$executeRaw">,
  updates: Array<{
    id: string;
    successful: boolean;
    lastUsedAt: Date;
  }>,
) {
  if (!updates.length) return 0;

  const values = Prisma.join(
    updates.map((update) =>
      Prisma.sql`(
        ${update.id}::text,
        ${update.successful ? 1 : 0}::integer,
        ${update.lastUsedAt}::timestamptz
      )`,
    ),
  );

  return db.$executeRaw(
    Prisma.sql`
      UPDATE "ConversationTarget" AS target
      SET
        "uses" = target."uses" + 1,
        "successfulUses" = target."successfulUses" + v.successful,
        "lastUsedAt" = v.last_used_at
      FROM (
        VALUES ${values}
      ) AS v(id, successful, last_used_at)
      WHERE target.id = v.id
    `,
  );
}
