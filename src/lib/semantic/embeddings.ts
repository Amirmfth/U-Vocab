import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOpenAI } from "@/lib/ai/client";
import { recordAIUsage } from "@/lib/ai/usage";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_VERSION,
} from "./config";

function vectorLiteral(values: number[]) {
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      "Embedding dimension mismatch: expected " +
        EMBEDDING_DIMENSIONS +
        ", received " +
        values.length,
    );
  }

  return "[" + values.join(",") + "]";
}

export async function embedText(input: {
  userId: string;
  operation: string;
  text: string;
}) {
  const cleaned = input.text.replaceAll("\n", " ").trim();
  if (!cleaned) throw new Error("Cannot embed empty text.");

  try {
    const response = await getOpenAI().embeddings.create({
      model: EMBEDDING_MODEL,
      input: cleaned,
      encoding_format: "float",
    });

    await recordAIUsage({
      userId: input.userId,
      operation: input.operation,
      model: EMBEDDING_MODEL,
      status: "SUCCESS",
      usage: {
        input_tokens: response.usage.prompt_tokens,
        total_tokens: response.usage.total_tokens,
      },
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) throw new Error("OpenAI returned no embedding.");

    return embedding;
  } catch (error) {
    await recordAIUsage({
      userId: input.userId,
      operation: input.operation,
      model: EMBEDDING_MODEL,
      status: "ERROR",
      errorMessage:
        error instanceof Error ? error.message : "Unknown embedding error",
    });
    throw error;
  }
}

async function lexemeEmbeddingText(lexemeId: string) {
  const lexeme = await db.lexeme.findUnique({
    where: { id: lexemeId },
    include: {
      translations: true,
      patterns: true,
      examples: { take: 3 },
    },
  });
  if (!lexeme) throw new Error("Lexeme not found.");

  return [
    lexeme.lemma,
    lexeme.article,
    lexeme.partOfSpeech,
    ...lexeme.translations.map(
      (translation) => translation.language + ": " + translation.text,
    ),
    ...lexeme.patterns.map((pattern) => pattern.pattern),
    ...lexeme.examples.map((example) => example.german),
  ]
    .filter(Boolean)
    .join(" | ");
}

export async function ensureLexemeEmbedding(
  lexemeId: string,
  userId: string,
  force = false,
) {
  const metadata = await db.lexeme.findUnique({
    where: { id: lexemeId },
    select: {
      id: true,
      embeddingModel: true,
      embeddingVersion: true,
      embeddedAt: true,
    },
  });
  if (!metadata) throw new Error("Lexeme not found.");

  if (
    !force &&
    metadata.embeddedAt &&
    metadata.embeddingModel === EMBEDDING_MODEL &&
    metadata.embeddingVersion === EMBEDDING_VERSION
  ) {
    return;
  }

  const text = await lexemeEmbeddingText(lexemeId);
  const embedding = await embedText({
    userId,
    operation: "lexeme_embedding",
    text,
  });
  const vector = vectorLiteral(embedding);

  await db.$executeRaw(
    Prisma.sql`
      UPDATE "Lexeme"
      SET "embedding" = ${vector}::vector,
          "embeddingModel" = ${EMBEDDING_MODEL},
          "embeddingVersion" = ${EMBEDDING_VERSION},
          "embeddedAt" = NOW()
      WHERE "id" = ${lexemeId}
    `,
  );
}

export async function ensureMistakeEmbedding(
  mistakeId: string,
  userId: string,
  force = false,
) {
  const mistake = await db.mistake.findFirst({
    where: { id: mistakeId, userId },
    include: { lexeme: true },
  });
  if (!mistake) return;

  if (
    !force &&
    mistake.embeddedAt &&
    mistake.embeddingModel === EMBEDDING_MODEL &&
    mistake.embeddingVersion === EMBEDDING_VERSION
  ) {
    return;
  }

  const text = [
    mistake.type,
    mistake.lexeme?.lemma,
    mistake.expected ? "expected " + mistake.expected : null,
    mistake.actual ? "actual " + mistake.actual : null,
    mistake.explanation,
  ]
    .filter(Boolean)
    .join(" | ");

  const embedding = await embedText({
    userId,
    operation: "mistake_embedding",
    text,
  });
  const vector = vectorLiteral(embedding);

  await db.$executeRaw(
    Prisma.sql`
      UPDATE "Mistake"
      SET "embedding" = ${vector}::vector,
          "embeddingModel" = ${EMBEDDING_MODEL},
          "embeddingVersion" = ${EMBEDDING_VERSION},
          "embeddedAt" = NOW()
      WHERE "id" = ${mistakeId} AND "userId" = ${userId}
    `,
  );
}

export async function rebuildLexemeEmbeddings(input: {
  userId: string;
  limit?: number;
  force?: boolean;
}) {
  const rows = await db.lexeme.findMany({
    where: input.force
      ? {}
      : {
          OR: [
            { embeddedAt: null },
            { embeddingModel: { not: EMBEDDING_MODEL } },
            { embeddingVersion: { not: EMBEDDING_VERSION } },
          ],
        },
    select: { id: true },
    take: input.limit ?? 50,
    orderBy: { updatedAt: "asc" },
  });

  let completed = 0;
  for (const row of rows) {
    try {
      await ensureLexemeEmbedding(row.id, input.userId, Boolean(input.force));
      completed += 1;
    } catch (error) {
      console.error("Failed to rebuild lexeme embedding", row.id, error);
    }
  }

  return completed;
}

export async function rebuildMistakeEmbeddings(input: {
  userId: string;
  limit?: number;
  force?: boolean;
}) {
  const rows = await db.mistake.findMany({
    where: {
      userId: input.userId,
      ...(input.force
        ? {}
        : {
            OR: [
              { embeddedAt: null },
              { embeddingModel: { not: EMBEDDING_MODEL } },
              { embeddingVersion: { not: EMBEDDING_VERSION } },
            ],
          }),
    },
    select: { id: true },
    take: input.limit ?? 50,
    orderBy: { lastOccurredAt: "desc" },
  });

  let completed = 0;
  for (const row of rows) {
    try {
      await ensureMistakeEmbedding(row.id, input.userId, Boolean(input.force));
      completed += 1;
    } catch (error) {
      console.error("Failed to rebuild mistake embedding", row.id, error);
    }
  }

  return completed;
}
