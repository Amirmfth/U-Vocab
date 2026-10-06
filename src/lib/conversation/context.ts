import { db } from "@/lib/db";

export async function buildConversationContext(input: {
  userId: string;
  userCourseId: string;
  sessionId: string;
  messageLimit?: number;
}) {
  const session = await db.conversationSession.findFirst({
    where: { id: input.sessionId, userCourseId: input.userCourseId },
    include: {
      targets: {
        include: {
          lexeme: {
            include: {
              patterns: true,
              outgoing: {
                include: {
                  target: {
                    include: {
                      userStates: {
                        where: { userCourseId: input.userCourseId },
                        take: 1,
                      },
                    },
                  },
                },
                take: 3,
              },
              incoming: {
                include: {
                  source: {
                    include: {
                      userStates: {
                        where: { userCourseId: input.userCourseId },
                        take: 1,
                      },
                    },
                  },
                },
                take: 3,
              },
            },
          },
        },
        orderBy: { position: "asc" },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: input.messageLimit ?? 8,
      },
      course: {
        select: {
          targetLevel: true,
          explanationLanguage: true,
          targetLanguage: true,
        },
      },
    },
  });

  if (!session) throw new Error("Conversation session not found.");

  const targetIds = session.targets.map((target) => target.lexemeId);
  const mistakes = await db.mistake.findMany({
    where: {
      userCourseId: input.userCourseId,
      resolvedAt: null,
      lexemeId: { in: targetIds },
    },
    include: { lexeme: true },
    orderBy: [{ occurrences: "desc" }, { lastOccurredAt: "desc" }],
    take: 6,
  });

  const relatedKnown = new Map<string, string>();
  for (const target of session.targets) {
    for (const relation of target.lexeme.outgoing) {
      if (relation.target.userStates.length) {
        relatedKnown.set(relation.target.id, relation.target.lemma);
      }
    }
    for (const relation of target.lexeme.incoming) {
      if (relation.source.userStates.length) {
        relatedKnown.set(relation.source.id, relation.source.lemma);
      }
    }
  }

  return {
    session: {
      id: session.id,
      kind: session.kind,
      level: session.level,
      title: session.title,
      scenario: session.scenario,
      aiRole: session.aiRole,
      objective: session.objective,
      revealTargets: session.revealTargets,
      tone: session.tone,
      formality: session.formality,
    },
    learner: {
      level: session.course.targetLevel,
      targetLanguage: session.course.targetLanguage,
      translationPreference: session.course.explanationLanguage,
    },
    targets: session.targets.map((target) => ({
      id: target.lexemeId,
      lemma: target.lexeme.lemma,
      article: target.lexeme.article,
      partOfSpeech: target.lexeme.partOfSpeech,
      patterns: target.lexeme.patterns.map((pattern) => pattern.pattern),
      uses: target.uses,
      successfulUses: target.successfulUses,
    })),
    relatedKnown: Array.from(relatedKnown.values()).slice(0, 8),
    mistakes: mistakes.map((mistake) => ({
      lexeme: mistake.lexeme?.lemma ?? null,
      type: mistake.type,
      expected: mistake.expected,
      actual: mistake.actual,
      explanation: mistake.explanation,
      occurrences: mistake.occurrences,
    })),
    messages: session.messages.reverse().map((message) => ({
      role: message.role === "USER" ? "user" as const : "assistant" as const,
      content: message.content,
    })),
  };
}
