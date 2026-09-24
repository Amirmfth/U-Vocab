import type { PrismaClient, SessionActivity, SessionKind } from "@prisma/client";

type PlannedItem = {
  activity: SessionActivity;
  lexemeId?: string | null;
  title: string;
  description?: string | null;
  href: string;
  plannedMinutes: number;
};

function splitMinutes(total: number, kind: SessionKind) {
  if (kind === "DAILY_CHALLENGE") {
    return { warmup: 2, review: 3, newWord: 2, context: 2, production: 2, final: 1 };
  }

  const scale = total / 60;
  return {
    warmup: Math.max(2, Math.round(5 * scale)),
    review: Math.max(4, Math.round(15 * scale)),
    newWord: Math.max(4, Math.round(15 * scale)),
    context: Math.max(3, Math.round(10 * scale)),
    production: Math.max(3, Math.round(10 * scale)),
    final: Math.max(2, Math.round(5 * scale)),
  };
}

export async function buildSessionPlan(
  db: PrismaClient,
  input: {
    userId: string;
    kind: SessionKind;
    minutes: number;
  },
) {
  const now = new Date();
  const [due, weak, fresh, latestStory, latestReading] = await Promise.all([
    db.userVocabulary.findMany({
      where: {
        userId: input.userId,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
      },
      include: { lexeme: true },
      orderBy: [{ nextReviewAt: "asc" }, { meaningRecall: "asc" }],
      take: 8,
    }),
    db.userVocabulary.findMany({
      where: { userId: input.userId },
      include: {
        lexeme: {
          include: {
            mistakes: {
              where: { userId: input.userId, resolvedAt: null },
              select: { occurrences: true },
            },
          },
        },
      },
      orderBy: [{ production: "asc" }, { contextualUsage: "asc" }],
      take: 24,
    }),
    db.userVocabulary.findMany({
      where: { userId: input.userId, state: { in: ["NEW", "LEARNING"] } },
      include: { lexeme: true },
      orderBy: { addedAt: "desc" },
      take: 8,
    }),
    db.story.findFirst({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
    db.readingDocument.findFirst({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
  ]);

  const minutes = splitMinutes(input.minutes, input.kind);
  const items: PlannedItem[] = [];

  const prioritizedWeak = [...weak].sort((a, b) => {
    const aMistakes = a.lexeme.mistakes.reduce(
      (sum, mistake) => sum + mistake.occurrences,
      0,
    );
    const bMistakes = b.lexeme.mistakes.reduce(
      (sum, mistake) => sum + mistake.occurrences,
      0,
    );
    if (aMistakes !== bMistakes) return bMistakes - aMistakes;
    if (a.production !== b.production) return a.production - b.production;
    return a.contextualUsage - b.contextualUsage;
  });

  const warmup = prioritizedWeak[0] ?? due[0] ?? fresh[0];
  if (warmup) {
    items.push({
      activity: "WARMUP",
      lexemeId: warmup.lexemeId,
      title: "Warm up with " + warmup.lexeme.lemma,
      description: "Start with one weak lexical unit.",
      href: "/practice?lexeme=" + warmup.lexemeId,
      plannedMinutes: minutes.warmup,
    });
  }

  const reviewWord = due[0];
  if (reviewWord) {
    items.push({
      activity: "DUE_REVIEW",
      lexemeId: reviewWord.lexemeId,
      title: due.length + (due.length === 1 ? " review is due" : " reviews are due"),
      description: "Let FSRS decide what is due; finish a review block.",
      href: "/review",
      plannedMinutes: minutes.review,
    });
  }

  const newWord = fresh.find((item) => item.id !== warmup?.id) ?? fresh[0];
  if (newWord) {
    items.push({
      activity: "NEW_WORD",
      lexemeId: newWord.lexemeId,
      title: "Learn " + newWord.lexeme.lemma,
      description: "Build meaning, pattern, context, and production.",
      href: "/vocabulary/" + newWord.lexemeId + "/teach",
      plannedMinutes: minutes.newWord,
    });
  }

  if (latestReading || latestStory) {
    const context = latestReading
      ? {
          title: latestReading.title ?? "Recent reading",
          href: "/read/" + latestReading.id,
        }
      : {
          title: latestStory!.title,
          href: "/stories/" + latestStory!.id,
        };

    items.push({
      activity: "CONTEXT",
      title: "Context: " + context.title,
      description: "Re-encounter vocabulary in connected German.",
      href: context.href,
      plannedMinutes: minutes.context,
    });
  } else {
    items.push({
      activity: "CONTEXT",
      title: "Generate contextual reading",
      description: "Use Reading Mode or a Story for contextual exposure.",
      href: "/stories",
      plannedMinutes: minutes.context,
    });
  }

  const production = prioritizedWeak.find(
    (item) => item.lexemeId !== warmup?.lexemeId && item.production < 0.65,
  ) ?? prioritizedWeak[1] ?? prioritizedWeak[0];
  if (production) {
    items.push({
      activity: "PRODUCTION",
      lexemeId: production.lexemeId,
      title: "Produce " + production.lexeme.lemma,
      description: "Use a weak lexical unit actively.",
      href: "/practice?lexeme=" + production.lexemeId,
      plannedMinutes: minutes.production,
    });
  }

  const finalWord = prioritizedWeak.find(
    (item) =>
      item.lexemeId !== warmup?.lexemeId &&
      item.lexemeId !== production?.lexemeId,
  ) ?? due[1] ?? fresh[1] ?? warmup;
  if (finalWord) {
    items.push({
      activity: "FINAL_CHALLENGE",
      lexemeId: finalWord.lexemeId,
      title: "Final mixed challenge",
      description: "Finish with retrieval or production on a different lexical unit.",
      href: "/practice?lexeme=" + finalWord.lexemeId,
      plannedMinutes: minutes.final,
    });
  }

  return items;
}
