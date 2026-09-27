import type {
  CefrLevel,
  GrammarProgressStatus,
  PrismaClient,
} from "@prisma/client";
import { CEFR_RANK } from "@/lib/grammar/levels";

export type GrammarRecommendationReason =
  | "WEAKNESS"
  | "CONTINUE"
  | "PREREQUISITE"
  | "NEXT_TARGET";

export type GrammarRecommendationCandidate = {
  id: string;
  slug: string;
  title: string;
  introducedAt: CefrLevel;
  status: GrammarProgressStatus;
  unresolvedMistakes: number;
  recentEvidenceAt: Date | null;
  recentEvidenceCount: number;
  relatedVocabularyCount: number;
  prerequisiteIds: string[];
};

export function rankGrammarRecommendation(
  candidates: GrammarRecommendationCandidate[],
  statuses: ReadonlyMap<string, GrammarProgressStatus>,
  currentLevel: CefrLevel,
  targetLevel: CefrLevel,
) {
  const usable = candidates.filter(
    (candidate) =>
      candidate.status !== "STRONG" &&
      CEFR_RANK[candidate.introducedAt] <= CEFR_RANK[targetLevel],
  );

  const weakness = [...usable]
    .filter(
      (candidate) =>
        candidate.status === "NEEDS_ATTENTION" ||
        candidate.unresolvedMistakes > 0,
    )
    .sort(
      (a, b) =>
        b.unresolvedMistakes - a.unresolvedMistakes ||
        (b.recentEvidenceAt?.getTime() ?? 0) -
          (a.recentEvidenceAt?.getTime() ?? 0),
    )[0];
  if (weakness) {
    return {
      candidate: weakness,
      reasonCode: "WEAKNESS" as const,
      reason:
        weakness.unresolvedMistakes > 0
          ? weakness.unresolvedMistakes +
            " unresolved grammar mistake" +
            (weakness.unresolvedMistakes === 1 ? "" : "s")
          : "Recent evidence shows this structure needs attention",
    };
  }

  const learning = usable
    .filter((candidate) => candidate.status === "LEARNING")
    .sort(
      (a, b) =>
        (b.recentEvidenceAt?.getTime() ?? 0) -
        (a.recentEvidenceAt?.getTime() ?? 0),
    )[0];
  if (learning) {
    return {
      candidate: learning,
      reasonCode: "CONTINUE" as const,
      reason: "Continue a grammar concept already in progress",
    };
  }

  for (const candidate of usable.sort(
    (a, b) =>
      CEFR_RANK[a.introducedAt] - CEFR_RANK[b.introducedAt],
  )) {
    const missing = candidate.prerequisiteIds.find((id) => {
      const status = statuses.get(id) ?? "UNASSESSED";
      return status !== "ASSUMED" && status !== "STRONG";
    });
    if (!missing) continue;
    const prerequisite = usable.find((item) => item.id === missing);
    if (prerequisite) {
      return {
        candidate: prerequisite,
        reasonCode: "PREREQUISITE" as const,
        reason: "This prerequisite unlocks grammar closer to your target level",
      };
    }
  }

  const next = usable
    .filter(
      (candidate) =>
        candidate.status === "UNASSESSED" &&
        candidate.recentEvidenceCount < 3 &&
        CEFR_RANK[candidate.introducedAt] >= CEFR_RANK[currentLevel],
    )
    .sort(
      (a, b) =>
        b.relatedVocabularyCount - a.relatedVocabularyCount ||
        CEFR_RANK[a.introducedAt] - CEFR_RANK[b.introducedAt],
    )[0];
  return next
    ? {
        candidate: next,
        reasonCode: "NEXT_TARGET" as const,
        reason:
          "A next-step " +
          next.introducedAt +
          " concept on the path to " +
          targetLevel,
      }
    : null;
}

export async function getGrammarRecommendation(
  db: PrismaClient,
  input: {
    userId: string;
    currentLevel: CefrLevel;
    targetLevel: CefrLevel;
  },
) {
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const concepts = await db.grammarConcept.findMany({
    where: {
      active: true,
      language: "de",
      introducedAt: {
        in: (Object.keys(CEFR_RANK) as CefrLevel[]).filter(
          (level) => CEFR_RANK[level] <= CEFR_RANK[input.targetLevel],
        ),
      },
    },
    include: {
      userProgress: {
        where: { userId: input.userId },
        take: 1,
      },
      prerequisites: { select: { prerequisiteId: true } },
      mistakes: {
        where: { userId: input.userId, resolvedAt: null },
        select: { occurrences: true },
      },
      evidence: {
        where: {
          userId: input.userId,
          accepted: true,
          createdAt: { gte: recentCutoff },
        },
        select: { id: true },
        take: 4,
      },
      lexemeLinks: {
        where: {
          lexeme: { userStates: { some: { userId: input.userId } } },
        },
        select: { id: true },
        take: 6,
      },
    },
    orderBy: { order: "asc" },
  });

  const statuses = new Map<string, GrammarProgressStatus>(
    concepts.map((concept) => [
      concept.id,
      concept.userProgress[0]?.status ?? "UNASSESSED",
    ]),
  );
  const ranked = rankGrammarRecommendation(
    concepts.map((concept) => ({
      id: concept.id,
      slug: concept.slug,
      title: concept.title,
      introducedAt: concept.introducedAt,
      status: concept.userProgress[0]?.status ?? "UNASSESSED",
      unresolvedMistakes: concept.mistakes.reduce(
        (sum, mistake) => sum + mistake.occurrences,
        0,
      ),
      recentEvidenceAt: concept.userProgress[0]?.lastEvidenceAt ?? null,
      recentEvidenceCount: concept.evidence.length,
      relatedVocabularyCount: concept.lexemeLinks.length,
      prerequisiteIds: concept.prerequisites.map(
        (edge) => edge.prerequisiteId,
      ),
    })),
    statuses,
    input.currentLevel,
    input.targetLevel,
  );

  if (!ranked) return null;
  return {
    ...ranked,
    conceptId: ranked.candidate.id,
    slug: ranked.candidate.slug,
    title: ranked.candidate.title,
    level: ranked.candidate.introducedAt,
    status: ranked.candidate.status,
    href: "/grammar/" + ranked.candidate.slug,
    practiceHref: "/practice?grammar=" + ranked.candidate.slug,
  };
}


export function grammarRecommendationActionHref(input: {
  conceptId: string;
  reasonCode: GrammarRecommendationReason;
  surface: "home" | "focus" | "practice";
  action: "learn" | "practice";
}) {
  const params = new URLSearchParams({
    concept: input.conceptId,
    reason: input.reasonCode,
    surface: input.surface,
    action: input.action,
  });
  return "/grammar/recommended?" + params.toString();
}
