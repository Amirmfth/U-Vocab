import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  ensureLexemeEmbedding,
  rebuildLexemeEmbeddings,
} from "@/lib/semantic/embeddings";

export type RecommendationReason = {
  label: string;
  weight: number;
};

export type VocabularyRecommendation = {
  lexemeId: string;
  lemma: string;
  article: string | null;
  partOfSpeech: string;
  english: string | null;
  persian: string | null;
  score: number;
  similarity: number;
  reasons: RecommendationReason[];
};

export function scoreRecommendation(input: {
  similarity: number;
  graphNeighbor: boolean;
  recentEncounter: boolean;
  levelMatch: boolean;
  weakAnchor: boolean;
}) {
  const reasons: RecommendationReason[] = [];
  let score = 0;

  if (input.graphNeighbor) {
    score += 0.24;
    reasons.push({ label: "connected to vocabulary you know", weight: 0.24 });
  }
  if (input.recentEncounter) {
    score += 0.16;
    reasons.push({ label: "you encountered it recently", weight: 0.16 });
  }
  if (input.levelMatch) {
    score += 0.1;
    reasons.push({ label: "matches your target level", weight: 0.1 });
  }
  if (input.weakAnchor) {
    score += 0.08;
    reasons.push({ label: "reinforces a recurring weak area", weight: 0.08 });
  }
  if (input.similarity > 0) {
    const semanticWeight = Math.max(
      0,
      Math.min(0.27, input.similarity * 0.27),
    );
    score += semanticWeight;
    reasons.push({
      label: "semantically close to vocabulary you are learning",
      weight: semanticWeight,
    });
  }

  return {
    score: Math.min(1, score),
    reasons: reasons.sort((a, b) => b.weight - a.weight),
  };
}

export async function prepareRecommendationEmbeddings(userId: string) {
  return rebuildLexemeEmbeddings({ userId, limit: 30 });
}

export async function getVocabularyRecommendations(
  userId: string,
  limit = 20,
): Promise<VocabularyRecommendation[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { targetLevel: true },
  });
  if (!user) return [];

  const [known, dismissed, recentUnknownEncounters] = await Promise.all([
    db.userVocabulary.findMany({
      where: { userId },
      include: {
        lexeme: {
          include: {
            outgoing: { select: { targetId: true } },
            incoming: { select: { sourceId: true } },
            mistakes: {
              where: { userId, resolvedAt: null },
              select: { occurrences: true },
            },
          },
        },
      },
      orderBy: [{ production: "asc" }, { contextualUsage: "asc" }],
    }),
    db.recommendationFeedback.findMany({
      where: { userId, action: "DISMISSED" },
      select: { lexemeId: true },
    }),
    db.encounter.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        },
        lexeme: {
          userStates: { none: { userId } },
        },
      },
      select: { lexemeId: true },
      distinct: ["lexemeId"],
      take: 100,
    }),
  ]);

  const dismissedIds = new Set(dismissed.map((item) => item.lexemeId));
  const graphIds = new Set(
    known.flatMap((item) => [
      ...item.lexeme.outgoing.map((relation) => relation.targetId),
      ...item.lexeme.incoming.map((relation) => relation.sourceId),
    ]),
  );
  const encounteredIds = new Set(
    recentUnknownEncounters.map((encounter) => encounter.lexemeId),
  );
  const weakAnchorIds = known
    .filter(
      (item) =>
        item.production < 0.5 ||
        item.contextualUsage < 0.5 ||
        item.lexeme.mistakes.reduce(
          (sum, mistake) => sum + mistake.occurrences,
          0,
        ) >= 2,
    )
    .slice(0, 8)
    .map((item) => item.lexemeId);

  const levelCandidates = await db.lexeme.findMany({
      where: {
        userStates: { none: { userId } },
        cefrLevel: user.targetLevel,
      },
      select: { id: true },
      take: 120,
      orderBy: { updatedAt: "desc" },
    });

  const semanticSimilarities = new Map<string, number>();

  for (const anchorId of weakAnchorIds.slice(0, 4)) {
    try {
      await ensureLexemeEmbedding(anchorId, userId);
    } catch {
      continue;
    }

    const rows = await db.$queryRaw<
      Array<{ candidateId: string; similarity: number }>
    >(Prisma.sql`
      SELECT candidate."id" AS "candidateId",
             1 - (candidate."embedding" <=> anchor."embedding") AS similarity
      FROM "Lexeme" candidate
      JOIN "Lexeme" anchor ON anchor."id" = ${anchorId}
      WHERE candidate."embedding" IS NOT NULL
        AND candidate."id" <> anchor."id"
        AND NOT EXISTS (
          SELECT 1
          FROM "UserVocabulary" uv
          WHERE uv."userId" = ${userId}
            AND uv."lexemeId" = candidate."id"
        )
      ORDER BY candidate."embedding" <=> anchor."embedding"
      LIMIT 40
    `);

    for (const row of rows) {
      const similarity = Number(row.similarity);
      semanticSimilarities.set(
        row.candidateId,
        Math.max(semanticSimilarities.get(row.candidateId) ?? 0, similarity),
      );
    }
  }

  const signalIds = new Set<string>([
    ...graphIds,
    ...encounteredIds,
    ...levelCandidates.map((item) => item.id),
    ...semanticSimilarities.keys(),
  ]);

  for (const dismissedId of dismissedIds) signalIds.delete(dismissedId);

  if (!signalIds.size) return [];

  const candidates = await db.lexeme.findMany({
    where: {
      id: { in: [...signalIds] },
      userStates: { none: { userId } },
      recommendationFeedback: {
        none: { userId, action: "DISMISSED" },
      },
    },
    include: {
      translations: true,
    },
  });

  return candidates
    .map((candidate) => {
      const similarity = semanticSimilarities.get(candidate.id) ?? 0;
      const graphNeighbor = graphIds.has(candidate.id);
      const recentEncounter = encounteredIds.has(candidate.id);
      const levelMatch = candidate.cefrLevel === user.targetLevel;
      const semanticWeakLink = similarity >= 0.72;

      const ranked = scoreRecommendation({
        similarity,
        graphNeighbor,
        recentEncounter,
        levelMatch,
        weakAnchor: semanticWeakLink,
      });

      const english =
        candidate.translations.find(
          (translation) => translation.language === "en",
        )?.text ?? null;
      const persian =
        candidate.translations.find(
          (translation) => translation.language === "fa",
        )?.text ?? null;

      return {
        lexemeId: candidate.id,
        lemma: candidate.lemma,
        article: candidate.article,
        partOfSpeech: candidate.partOfSpeech,
        english,
        persian,
        score: ranked.score,
        similarity,
        reasons: ranked.reasons,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
