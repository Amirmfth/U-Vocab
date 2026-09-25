import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { cacheTags } from "@/lib/cache-tags";

export function getCachedHomeStats(userId: string) {
  return unstable_cache(
    async () => {
      const now = new Date();
      const [
        total,
        due,
        weakProduction,
        mistakes,
        activeFocus,
        activeWriting,
        activeConversation,
      ] = await Promise.all([
        db.userVocabulary.count({ where: { userId } }),
        db.userVocabulary.count({
          where: {
            userId,
            OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
          },
        }),
        db.userVocabulary.count({
          where: { userId, production: { lt: 0.4 } },
        }),
        db.mistake.count({ where: { userId, resolvedAt: null } }),
        db.learningSession.findFirst({
          where: { userId, status: "ACTIVE" },
          select: { id: true, lastActiveAt: true, plannedMinutes: true },
          orderBy: { lastActiveAt: "desc" },
        }),
        db.writingSession.findFirst({
          where: { userId, status: "ACTIVE" },
          select: { id: true, createdAt: true, taskType: true },
          orderBy: { createdAt: "desc" },
        }),
        db.conversationSession.findFirst({
          where: { userId, status: "ACTIVE" },
          select: { id: true, updatedAt: true, kind: true },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      const candidates = [
        activeFocus
          ? {
              href: "/focus/" + activeFocus.id,
              label: "Focus session",
              detail: activeFocus.plannedMinutes + "-minute plan",
              at: activeFocus.lastActiveAt,
            }
          : null,
        activeWriting
          ? {
              href: "/writing/" + activeWriting.id,
              label: "Writing",
              detail: activeWriting.taskType,
              at: activeWriting.createdAt,
            }
          : null,
        activeConversation
          ? {
              href: "/conversation/" + activeConversation.id,
              label:
                activeConversation.kind === "MISSION"
                  ? "Speaking mission"
                  : "Conversation",
              detail: "Continue speaking practice",
              at: activeConversation.updatedAt,
            }
          : null,
      ].filter(
        (
          item,
        ): item is {
          href: string;
          label: string;
          detail: string;
          at: Date;
        } => Boolean(item),
      );

      candidates.sort((a, b) => b.at.getTime() - a.at.getTime());
      const recent = candidates[0]
        ? {
            href: candidates[0].href,
            label: candidates[0].label,
            detail: candidates[0].detail,
          }
        : null;

      return { total, due, weakProduction, mistakes, recent };
    },
    ["home-stats", userId],
    {
      tags: [
        cacheTags.home(userId),
        cacheTags.vocabulary(userId),
        cacheTags.review(userId),
        cacheTags.mistakes(userId),
        cacheTags.writing(userId),
        cacheTags.conversation(userId),
      ],
      revalidate: 60,
    },
  )();
}

export function getCachedVocabularyLibrary(userId: string) {
  return unstable_cache(
    async () =>
      Promise.all([
        db.userVocabulary.findMany({
          where: { userId },
          include: {
            lexeme: {
              include: {
                translations: true,
                patterns: true,
                insights: { select: { level: true } },
                outgoing: {
                  select: {
                    type: true,
                    target: { select: { lemma: true } },
                  },
                },
                incoming: {
                  select: {
                    type: true,
                    source: { select: { lemma: true } },
                  },
                },
                topicPackItems: {
                  select: {
                    topicPackId: true,
                    topicPack: { select: { topic: true } },
                  },
                },
                encounters: {
                  where: { userId },
                  select: { createdAt: true },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
          orderBy: { addedAt: "desc" },
          take: 500,
        }),
        db.topicPack.findMany({
          where: { userId },
          select: { id: true, title: true, topic: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ]),
    ["vocabulary-library", userId],
    {
      tags: [
        cacheTags.vocabulary(userId),
        cacheTags.topicPacks(userId),
      ],
      revalidate: 300,
    },
  )();
}

export function getCachedWordPrimary(userId: string, lexemeId: string) {
  return unstable_cache(
    async () =>
      db.lexeme.findUnique({
        where: { id: lexemeId },
        include: {
          translations: true,
          patterns: true,
          userStates: {
            where: { userId },
            take: 1,
          },
        },
      }),
    ["word-primary", userId, lexemeId],
    {
      tags: [
        cacheTags.word(lexemeId),
        cacheTags.vocabulary(userId),
        cacheTags.review(userId),
      ],
      revalidate: 300,
    },
  )();
}

export function getCachedWordSecondary(
  userId: string,
  lexemeId: string,
  level: string,
) {
  return unstable_cache(
    async () =>
      db.lexeme.findUnique({
        where: { id: lexemeId },
        include: {
          examples: true,
          insights: {
            where: { level },
            take: 1,
          },
          outgoing: {
            include: { target: true },
            take: 10,
          },
          incoming: {
            include: { source: true },
            take: 10,
          },
          encounters: {
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 8,
          },
          mistakes: {
            where: { userId },
            orderBy: { lastOccurredAt: "desc" },
            take: 8,
          },
          topicPackItems: {
            include: { topicPack: true },
            take: 8,
          },
          userStates: {
            where: { userId },
            include: {
              reviews: {
                orderBy: { reviewedAt: "desc" },
                take: 8,
              },
            },
            take: 1,
          },
        },
      }),
    ["word-secondary", userId, lexemeId, level],
    {
      tags: [
        cacheTags.word(lexemeId),
        cacheTags.review(userId),
        cacheTags.mistakes(userId),
        cacheTags.topicPacks(userId),
      ],
      revalidate: 300,
    },
  )();
}

export function getCachedReadingIndex(userId: string) {
  return unstable_cache(
    async () =>
      db.readingDocument.findMany({
        where: { userId },
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ["reading-index", userId],
    {
      tags: [cacheTags.reading(userId)],
      revalidate: 300,
    },
  )();
}

export function getCachedWritingIndex(userId: string) {
  return unstable_cache(
    async () =>
      Promise.all([
        db.topicPack.findMany({
          where: { userId },
          select: { id: true, title: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        db.writingSession.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
      ]),
    ["writing-index", userId],
    {
      tags: [
        cacheTags.writing(userId),
        cacheTags.topicPacks(userId),
      ],
      revalidate: 300,
    },
  )();
}
