import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { embedText, ensureLexemeEmbedding } from "./embeddings";

function vectorLiteral(values: number[]) {
  return "[" + values.join(",") + "]";
}

export async function findSimilarLexemes(input: {
  userId: string;
  lexemeId: string;
  limit?: number;
  excludeUserVocabulary?: boolean;
}) {
  await ensureLexemeEmbedding(input.lexemeId, input.userId);

  const rows = await db.$queryRaw<Array<{ id: string; similarity: number }>>(
    Prisma.sql`
      SELECT candidate."id",
             1 - (candidate."embedding" <=> source."embedding") AS similarity
      FROM "Lexeme" candidate
      CROSS JOIN "Lexeme" source
      WHERE source."id" = ${input.lexemeId}
        AND candidate."id" <> source."id"
        AND candidate."embedding" IS NOT NULL
        ${input.excludeUserVocabulary
          ? Prisma.sql`
              AND NOT EXISTS (
                SELECT 1
                FROM "UserVocabulary" uv
                WHERE uv."userId" = ${input.userId}
                  AND uv."lexemeId" = candidate."id"
              )
            `
          : Prisma.empty}
      ORDER BY candidate."embedding" <=> source."embedding"
      LIMIT ${input.limit ?? 12}
    `,
  );

  const lexemes = await db.lexeme.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    include: { translations: true, patterns: true },
  });
  const byId = new Map(lexemes.map((lexeme) => [lexeme.id, lexeme]));

  return rows
    .map((row) => {
      const lexeme = byId.get(row.id);
      return lexeme
        ? { lexeme, similarity: Number(row.similarity) }
        : null;
    })
    .filter(
      (
        value,
      ): value is {
        lexeme: NonNullable<typeof value>["lexeme"];
        similarity: number;
      } => Boolean(value),
    );
}

export async function semanticLexemeSearch(input: {
  userId: string;
  query: string;
  limit?: number;
  excludeKnown?: boolean;
}) {
  const embedding = await embedText({
    userId: input.userId,
    operation: "semantic_query_embedding",
    text: input.query,
  });
  const vector = vectorLiteral(embedding);

  return db.$queryRaw<Array<{ id: string; similarity: number }>>(
    Prisma.sql`
      SELECT "id",
             1 - ("embedding" <=> ${vector}::vector) AS similarity
      FROM "Lexeme"
      WHERE "embedding" IS NOT NULL
        ${input.excludeKnown
          ? Prisma.sql`
              AND NOT EXISTS (
                SELECT 1
                FROM "UserVocabulary" uv
                WHERE uv."userId" = ${input.userId}
                  AND uv."lexemeId" = "Lexeme"."id"
              )
            `
          : Prisma.empty}
      ORDER BY "embedding" <=> ${vector}::vector
      LIMIT ${input.limit ?? 20}
    `,
  );
}

export async function similarMistakePairs(input: {
  userId: string;
  threshold?: number;
}) {
  const threshold = input.threshold ?? 0.82;

  return db.$queryRaw<
    Array<{
      leftId: string;
      rightId: string;
      similarity: number;
    }>
  >(Prisma.sql`
    SELECT a."id" AS "leftId",
           b."id" AS "rightId",
           1 - (a."embedding" <=> b."embedding") AS similarity
    FROM "Mistake" a
    JOIN "Mistake" b
      ON a."id" < b."id"
     AND a."userId" = b."userId"
    WHERE a."userId" = ${input.userId}
      AND a."resolvedAt" IS NULL
      AND b."resolvedAt" IS NULL
      AND a."embedding" IS NOT NULL
      AND b."embedding" IS NOT NULL
      AND 1 - (a."embedding" <=> b."embedding") >= ${threshold}
    ORDER BY similarity DESC
    LIMIT 200
  `);
}
