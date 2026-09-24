import type { MistakeType, PrismaClient } from "@prisma/client";

export async function recordMistakes(
  db: PrismaClient,
  input: {
    userId: string;
    lexemeId: string;
    mistakes: Array<{
      type: MistakeType;
      expected: string | null;
      actual: string | null;
      explanation: string;
    }>;
  },
) {
  for (const mistake of input.mistakes) {
    const existing = await db.mistake.findFirst({
      where: {
        userId: input.userId,
        lexemeId: input.lexemeId,
        type: mistake.type,
        resolvedAt: null,
      },
    });

    if (existing) {
      await db.mistake.update({
        where: { id: existing.id },
        data: {
          occurrences: { increment: 1 },
          expected: mistake.expected,
          actual: mistake.actual,
          explanation: mistake.explanation,
          lastOccurredAt: new Date(),
        },
      });
    } else {
      await db.mistake.create({
        data: {
          userId: input.userId,
          lexemeId: input.lexemeId,
          type: mistake.type,
          expected: mistake.expected,
          actual: mistake.actual,
          explanation: mistake.explanation,
        },
      });
    }
  }
}
