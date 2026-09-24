import type { MistakeType, PrismaClient } from "@prisma/client";

export type MistakeInput = {
  lexemeId: string;
  type: MistakeType;
  expected: string | null;
  actual: string | null;
  explanation: string;
};

export async function recordMistakesBatch(
  db: PrismaClient,
  input: {
    userId: string;
    mistakes: MistakeInput[];
  },
) {
  if (!input.mistakes.length) return;

  const latestByKey = new Map<string, MistakeInput>();
  for (const mistake of input.mistakes) {
    latestByKey.set(mistake.lexemeId + ":" + mistake.type, mistake);
  }
  const mistakes = Array.from(latestByKey.values());

  const lexemeIds = Array.from(new Set(mistakes.map((item) => item.lexemeId)));
  const types = Array.from(new Set(mistakes.map((item) => item.type)));

  const existing = await db.mistake.findMany({
    where: {
      userId: input.userId,
      resolvedAt: null,
      lexemeId: { in: lexemeIds },
      type: { in: types },
    },
    select: {
      id: true,
      lexemeId: true,
      type: true,
    },
  });

  const existingByKey = new Map(
    existing
      .filter((item) => item.lexemeId)
      .map((item) => [item.lexemeId + ":" + item.type, item]),
  );

  const now = new Date();
  const creates = [];
  const updates = [];

  for (const mistake of mistakes) {
    const found = existingByKey.get(mistake.lexemeId + ":" + mistake.type);
    if (found) {
      updates.push(
        db.mistake.update({
          where: { id: found.id },
          data: {
            occurrences: { increment: 1 },
            expected: mistake.expected,
            actual: mistake.actual,
            explanation: mistake.explanation,
            lastOccurredAt: now,
            embeddedAt: null,
          },
        }),
      );
    } else {
      creates.push({
        userId: input.userId,
        lexemeId: mistake.lexemeId,
        type: mistake.type,
        expected: mistake.expected,
        actual: mistake.actual,
        explanation: mistake.explanation,
      });
    }
  }

  await db.$transaction([
    ...(creates.length ? [db.mistake.createMany({ data: creates })] : []),
    ...updates,
  ]);
}
