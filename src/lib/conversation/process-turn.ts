import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { evaluateConversationTurn } from "@/lib/ai/conversation-turn-evaluator";
import { recordMistakesBatch, type MistakeInput } from "@/lib/mistakes-batch";
import {
  updateConversationTargetsBatch,
  updateVocabularyMasteryBatch,
  type VocabularyMasteryUpdate,
} from "@/lib/vocabulary-batch";

export async function processConversationTurn(input: {
  userId: string;
  sessionId: string;
  message: string;
}) {
  const session = await db.conversationSession.findFirst({
    where: {
      id: input.sessionId,
      userId: input.userId,
      status: "ACTIVE",
    },
    include: {
      targets: {
        include: {
          lexeme: { include: { patterns: true } },
        },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!session) throw new Error("Conversation session not found.");

  const evaluation = await evaluateConversationTurn({
    userId: input.userId,
    level: session.level,
    message: input.message,
    targets: session.targets.map((target) => ({
      lexemeId: target.lexemeId,
      lemma: target.lexeme.lemma,
      patterns: target.lexeme.patterns.map((pattern) => pattern.pattern),
    })),
  });

  const targetByLexeme = new Map(
    session.targets.map((target) => [target.lexemeId, target]),
  );
  const used = evaluation.targetUsage.filter(
    (usage) => usage.used && targetByLexeme.has(usage.lexemeId),
  );
  const usedLexemeIds = used.map((usage) => usage.lexemeId);

  const vocabularyRows = usedLexemeIds.length
    ? await db.userVocabulary.findMany({
        where: {
          userId: input.userId,
          lexemeId: { in: usedLexemeIds },
        },
        select: {
          id: true,
          lexemeId: true,
          production: true,
          contextualUsage: true,
        },
      })
    : [];
  const vocabularyByLexeme = new Map(
    vocabularyRows.map((item) => [item.lexemeId, item]),
  );

  const attempts: Prisma.AttemptCreateManyInput[] = [];
  const masteryUpdates: VocabularyMasteryUpdate[] = [];
  const mistakes: MistakeInput[] = [];
  const now = new Date();

  for (const usage of used) {
    const target = targetByLexeme.get(usage.lexemeId);
    if (!target) continue;
    const userVocabulary = vocabularyByLexeme.get(usage.lexemeId);

    attempts.push({
      userId: input.userId,
      userVocabularyId: userVocabulary?.id ?? null,
      exerciseType: "FREE_SENTENCE" as const,
      prompt: "Use " + target.lexeme.lemma + " naturally in conversation.",
      answer: input.message,
      expected: target.lexeme.lemma,
      correct: usage.correct,
      score: usage.score,
      feedback: usage.feedback,
    });

    if (userVocabulary) {
      masteryUpdates.push({
        id: userVocabulary.id,
        production: Math.max(
          0,
          Math.min(
            1,
            userVocabulary.production + (usage.correct ? 0.08 : -0.025),
          ),
        ),
        contextualUsage: Math.max(
          0,
          Math.min(
            1,
            userVocabulary.contextualUsage + (usage.correct ? 0.1 : -0.02),
          ),
        ),
      });
    }

    for (const mistake of usage.mistakes) {
      mistakes.push({
        lexemeId: usage.lexemeId,
        ...mistake,
      });
    }
  }

  if (used.length) {
    await db.$transaction(async (tx) => {
      await updateConversationTargetsBatch(
        tx,
        used.map((usage) => ({
          id: targetByLexeme.get(usage.lexemeId)!.id,
          successful: usage.correct,
          lastUsedAt: now,
        })),
      );

      if (attempts.length) {
        await tx.attempt.createMany({ data: attempts });
      }

      await updateVocabularyMasteryBatch(tx, masteryUpdates);
    });
  }

  if (mistakes.length) {
    await recordMistakesBatch(db, {
      userId: input.userId,
      mistakes,
    });
  }

  return evaluation;
}
