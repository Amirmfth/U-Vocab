import type { MistakeType } from "@prisma/client";
import { db } from "@/lib/db";

export async function recordGrammarMistake(input: {
  userId: string;
  userCourseId: string;
  grammarConceptId: string;
  lexemeId?: string | null;
  type: MistakeType;
  expected: string;
  actual: string;
  explanation: string;
}) {
  const existing = await db.mistake.findFirst({
    where: {
      userCourseId: input.userCourseId,
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
      userCourseId: input.userCourseId,
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
  userCourseId: string;
  grammarConceptId: string;
  type: MistakeType;
  lexemeId?: string | null;
}) {
  return db.mistake.updateMany({
    where: {
      userCourseId: input.userCourseId,
      grammarConceptId: input.grammarConceptId,
      lexemeId: input.lexemeId ?? null,
      type: input.type,
      resolvedAt: null,
    },
    data: { resolvedAt: new Date() },
  });
}
