import { db } from "@/lib/db";
import { evaluateConversationTurn } from "@/lib/ai/conversation-turn-evaluator";
import { recordMistakes } from "@/lib/mistakes";

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

  for (const usage of evaluation.targetUsage) {
    if (!usage.used) continue;
    const target = targetByLexeme.get(usage.lexemeId);
    if (!target) continue;

    const userVocabulary = await db.userVocabulary.findUnique({
      where: {
        userId_lexemeId: {
          userId: input.userId,
          lexemeId: usage.lexemeId,
        },
      },
    });

    await db.$transaction(async (tx) => {
      await tx.conversationTarget.update({
        where: { id: target.id },
        data: {
          uses: { increment: 1 },
          successfulUses: usage.correct ? { increment: 1 } : undefined,
          lastUsedAt: new Date(),
        },
      });

      await tx.attempt.create({
        data: {
          userId: input.userId,
          userVocabularyId: userVocabulary?.id ?? null,
          exerciseType: "FREE_SENTENCE",
          prompt: "Use " + target.lexeme.lemma + " naturally in conversation.",
          answer: input.message,
          expected: target.lexeme.lemma,
          correct: usage.correct,
          score: usage.score,
          feedback: usage.feedback,
        },
      });

      if (userVocabulary) {
        await tx.userVocabulary.update({
          where: { id: userVocabulary.id },
          data: {
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
          },
        });
      }
    });

    if (usage.mistakes.length) {
      await recordMistakes(db, {
        userId: input.userId,
        lexemeId: usage.lexemeId,
        embed: false,
        mistakes: usage.mistakes,
      });
    }
  }

  return evaluation;
}
