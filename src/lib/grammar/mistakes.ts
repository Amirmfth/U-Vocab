import type { MistakeType } from "@prisma/client";
import { db } from "@/lib/db";

export async function recordGrammarMistake(input: {
  userId: string;
  grammarConceptId: string;
  lexemeId?: string | null;
  type: MistakeType;
  expected: string;
  actual: string;
  explanation: string;
}) {
  const existing = await db.mistake.findFirst({
    where: {
      userId: input.userId,
      grammarConceptId: input.grammarConceptId,
      lexemeId: input.lexemeId ?? null,
      type: input.type,
      resolvedAt: null,
    },
    orderBy: { lastOccurredAt: "desc" },
  });

  if (existing) {
    return db.mistake.update({
      where: { id: existing.id },
      data: {
        occurrences: { increment: 1 },
        expected: input.expected,
        actual: input.actual,
        explanation: input.explanation,
        lastOccurredAt: new Date(),
      },
    });
  }

  return db.mistake.create({
    data: {
      userId: input.userId,
      grammarConceptId: input.grammarConceptId,
      lexemeId: input.lexemeId ?? null,
      type: input.type,
      expected: input.expected,
      actual: input.actual,
      explanation: input.explanation,
    },
  });
}

export async function resolveGrammarMistakes(input: {
  userId: string;
  grammarConceptId: string;
  type: MistakeType;
  lexemeId?: string | null;
}) {
  return db.mistake.updateMany({
    where: {
      userId: input.userId,
      grammarConceptId: input.grammarConceptId,
      lexemeId: input.lexemeId ?? null,
      type: input.type,
      resolvedAt: null,
    },
    data: { resolvedAt: new Date() },
  });
}
