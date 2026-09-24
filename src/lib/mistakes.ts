import type { MistakeType, PrismaClient } from "@prisma/client";
import { ensureMistakeEmbedding } from "@/lib/semantic/embeddings";
import { recordMistakesBatch } from "@/lib/mistakes-batch";

export async function recordMistakes(
  db: PrismaClient,
  input: {
    userId: string;
    lexemeId: string;
    embed?: boolean;
    mistakes: Array<{
      type: MistakeType;
      expected: string | null;
      actual: string | null;
      explanation: string;
    }>;
  },
) {
  if (!input.mistakes.length) return;

  await recordMistakesBatch(db, {
    userId: input.userId,
    mistakes: input.mistakes.map((mistake) => ({
      lexemeId: input.lexemeId,
      ...mistake,
    })),
  });

  if (input.embed === false) return;

  const touched = await db.mistake.findMany({
    where: {
      userId: input.userId,
      lexemeId: input.lexemeId,
      resolvedAt: null,
      type: {
        in: Array.from(new Set(input.mistakes.map((mistake) => mistake.type))),
      },
    },
    select: { id: true },
  });

  const embeddingResults = await Promise.allSettled(
    touched.map((mistake) =>
      ensureMistakeEmbedding(mistake.id, input.userId, true),
    ),
  );

  for (const result of embeddingResults) {
    if (result.status === "rejected") {
      console.error("Failed to embed mistake", result.reason);
    }
  }
}
