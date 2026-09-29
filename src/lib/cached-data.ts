import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { cacheTags } from "@/lib/cache-tags";
import { localDateKey } from "@/lib/progress";

export function getCachedHomeStats(userId: string, userCourseId: string, timeZone: string) {
  return unstable_cache(
    async () => {
      const now = new Date();
      const [
        total,
        due,
        weakProduction,
        mistakes,
        activeWriting,
        activeConversation,
        recentAttempts,
        recentReviews,
        recentAdded,
      ] = await Promise.all([
        db.userVocabulary.count({ where: { userCourseId } }),
        db.userVocabulary.count({
          where: {
            userCourseId,
            OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
          },
        }),
        db.userVocabulary.count({
          where: { userCourseId, production: { lt: 0.4 } },
        }),
        db.mistake.count({ where: { userCourseId, resolvedAt: null } }),
        db.writingSession.findFirst({
          where: { userCourseId, status: "ACTIVE" },
          select: { id: true, createdAt: true, taskType: true },
          orderBy: { createdAt: "desc" },
        }),
        db.conversationSession.findFirst({
          where: { userCourseId, status: "ACTIVE" },
          select: { id: true, updatedAt: true, kind: true },
          orderBy: { updatedAt: "desc" },
        }),
        db.attempt.findMany({
          where: {
            userCourseId,
            createdAt: { gte: new Date(now.getTime() - 36 * 60 * 60 * 1000) },
          },
          select: { createdAt: true, durationMs: true },
        }),
        db.review.findMany({
          where: {
            userVocabulary: { userCourseId },
            reviewedAt: { gte: new Date(now.getTime() - 36 * 60 * 60 * 1000) },
          },
          select: { reviewedAt: true },
        }),
        db.userVocabulary.findMany({
          where: {
            userCourseId,
            addedAt: { gte: new Date(now.getTime() - 36 * 60 * 60 * 1000) },
          },
          select: { addedAt: true },
        }),
      ]);

      const candidates = [
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

      const todayKey = localDateKey(now, timeZone);
      const todayAttempts = recentAttempts.filter(
        (item) => localDateKey(item.createdAt, timeZone) === todayKey,
      );
      const todayReviews = recentReviews.filter(
        (item) => localDateKey(item.reviewedAt, timeZone) === todayKey,
      ).length;
      const todayAdded = recentAdded.filter(
        (item) => localDateKey(item.addedAt, timeZone) === todayKey,
      ).length;
      const todayMinutes = Math.round(
        todayAttempts.reduce(
          (sum, item) => sum + (item.durationMs ?? 0),
          0,
        ) / 60000,
      );

      return {
        total,
        due,
        weakProduction,
        mistakes,
        recent,
        today: {
          minutes: todayMinutes,
          reviews: todayReviews,
          added: todayAdded,
        },
      };
    },
    ["home-stats", userCourseId, timeZone],
    {
      tags: [
        cacheTags.home(userCourseId),
        cacheTags.vocabulary(userCourseId),
        cacheTags.review(userCourseId),
        cacheTags.mistakes(userCourseId),
        cacheTags.writing(userCourseId),
        cacheTags.conversation(userCourseId),
        cacheTags.progress(userCourseId),
      ],
      revalidate: 60,
    },
  )();
}

export function getCachedVocabularyLibrary(userId: string, userCourseId: string) {
  return unstable_cache(
    async () =>
      db.userVocabulary.findMany({
          where: { userCourseId },
          include: {
            lexeme: {
              include: {
                translations: true,
                patterns: true,
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
                encounters: {
                  where: { userCourseId },
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
    ["vocabulary-library", userCourseId],
    {
      tags: [cacheTags.vocabulary(userCourseId)],
      revalidate: 300,
    },
  )();
}

export function getCachedWordPrimary(userId: string, userCourseId: string, lexemeId: string) {
  return unstable_cache(
    async () =>
      db.lexeme.findUnique({
        where: { id: lexemeId },
        include: {
          translations: true,
          patterns: true,
          userStates: {
            where: { userCourseId },
            take: 1,
          },
        },
      }),
    ["word-primary", userCourseId, lexemeId],
    {
      tags: [
        cacheTags.word(userCourseId, lexemeId),
        cacheTags.vocabulary(userCourseId),
        cacheTags.review(userCourseId),
      ],
      revalidate: 300,
    },
  )();
}

export function getCachedWordSecondary(
  userId: string,
  userCourseId: string,
  lexemeId: string,
  level: string,
) {
  return unstable_cache(
    async () =>
      db.lexeme.findUnique({
        where: { id: lexemeId },
        include: {
          examples: true,
          outgoing: {
            include: { target: true },
            take: 10,
          },
          grammarLinks: {
            where: { confidence: { gte: 0.65 } },
            include: {
              grammarConcept: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  shortDescription: true,
                  introducedAt: true,
                },
              },
              lexicalPattern: { select: { pattern: true } },
            },
            orderBy: [{ confidence: "desc" }, { createdAt: "asc" }],
            take: 8,
          },
          incoming: {
            include: { source: true },
            take: 10,
          },
          encounters: {
            where: { userCourseId },
            orderBy: { createdAt: "desc" },
            take: 8,
          },
          mistakes: {
            where: { userCourseId },
            orderBy: { lastOccurredAt: "desc" },
            take: 8,
          },
          userStates: {
            where: { userCourseId },
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
    ["word-secondary", userCourseId, lexemeId, level],
    {
      tags: [
        cacheTags.word(userCourseId, lexemeId),
        cacheTags.review(userCourseId),
        cacheTags.mistakes(userCourseId),
      ],
      revalidate: 300,
    },
  )();
}

export function getCachedReadingIndex(userId: string, userCourseId: string) {
  return unstable_cache(
    async () =>
      db.readingDocument.findMany({
        where: { userCourseId },
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ["reading-index", userCourseId],
    {
      tags: [cacheTags.reading(userId)],
      revalidate: 300,
    },
  )();
}

export function getCachedWritingIndex(userId: string, userCourseId: string) {
  return unstable_cache(
    async () =>
      db.writingSession.findMany({
          where: { userCourseId, parentId: null },
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
    ["writing-index", userCourseId],
    {
      tags: [cacheTags.writing(userCourseId)],
      revalidate: 300,
    },
  )();
}
