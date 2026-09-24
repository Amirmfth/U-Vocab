import type { MistakeType, PrismaClient } from "@prisma/client";

export type MistakeInput = {
  lexemeId: string;
  type: MistakeType;
  expected: string | null;
  actual: string | null;
  explanation: string;
};

type GroupedMistake = MistakeInput & { occurrences: number };

export async function recordMistakesBatch(
  db: PrismaClient,
  input: {
    userId: string;
    mistakes: MistakeInput[];
  },
) {
  if (!input.mistakes.length) return;

  const grouped = new Map<string, GroupedMistake>();
  for (const mistake of input.mistakes) {
    const key = mistake.lexemeId + ":" + mistake.type;
    const current = grouped.get(key);
    grouped.set(key, {
      ...mistake,
      occurrences: (current?.occurrences ?? 0) + 1,
    });
  }
  const mistakes = Array.from(grouped.values());

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
            occurrences: { increment: mistake.occurrences },
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
        occurrences: mistake.occurrences,
        lastOccurredAt: now,
      });
    }
  }

  await db.$transaction([
    ...(creates.length ? [db.mistake.createMany({ data: creates })] : []),
    ...updates,
  ]);
}
