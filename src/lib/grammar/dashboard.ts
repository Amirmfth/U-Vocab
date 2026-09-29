import type {
  CefrLevel,
  GrammarCategory,
  GrammarProgressStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { CEFR_RANK } from "@/lib/grammar/levels";
import { targetLanguageConfig } from "@/lib/languages";

export type GrammarConceptWithState = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  category: GrammarCategory;
  introducedAt: CefrLevel;
  expectedBy: CefrLevel | null;
  order: number;
  status: GrammarProgressStatus;
  source: "DECLARED_LEVEL" | "EVIDENCE" | "MANUAL" | null;
  evidenceCount: number;
};

const PROGRESS_PRIORITY: Record<GrammarProgressStatus, number> = {
  NEEDS_ATTENTION: 0,
  LEARNING: 1,
  UNASSESSED: 2,
  ASSUMED: 3,
  STRONG: 4,
};

export async function getGrammarDashboard(userId: string, userCourseId: string) {
  const course = await db.userCourse.findFirstOrThrow({
    where: { id: userCourseId, userId },
  });
  const concepts = await db.grammarConcept.findMany({
      where: { active: true, language: targetLanguageConfig(course.targetLanguage).code },
      include: {
        userProgress: { where: { userCourseId }, take: 1 },
        prerequisites: { select: { prerequisiteId: true } },
      },
      orderBy: [{ order: "asc" }],
    });

  const statusById = new Map(
    concepts.map((concept) => [
      concept.id,
      concept.userProgress[0]?.status ?? "UNASSESSED",
    ]),
  );

  const items: GrammarConceptWithState[] = concepts.map((concept) => ({
    id: concept.id,
    slug: concept.slug,
    title: concept.title,
    shortDescription: concept.shortDescription,
    category: concept.category,
    introducedAt: concept.introducedAt,
    expectedBy: concept.expectedBy,
    order: concept.order,
    status: concept.userProgress[0]?.status ?? "UNASSESSED",
    source: concept.userProgress[0]?.source ?? null,
    evidenceCount: concept.userProgress[0]?.evidenceCount ?? 0,
  }));

  const needsAttention = items.filter((item) => item.status === "NEEDS_ATTENTION");
  const learning = items.filter((item) => item.status === "LEARNING");

  const recommended = concepts
    .filter((concept) => {
      const status = statusById.get(concept.id) ?? "UNASSESSED";
      if (status !== "UNASSESSED") return false;
      if (CEFR_RANK[concept.introducedAt] > CEFR_RANK[course.targetLevel]) return false;
      return concept.prerequisites.every((edge) => {
        const prerequisiteStatus = statusById.get(edge.prerequisiteId) ?? "UNASSESSED";
        return prerequisiteStatus === "ASSUMED" || prerequisiteStatus === "STRONG";
      });
    })
    .sort((a, b) => {
      const aDistance = Math.abs(
        CEFR_RANK[a.introducedAt] - CEFR_RANK[course.currentLevel],
      );
      const bDistance = Math.abs(
        CEFR_RANK[b.introducedAt] - CEFR_RANK[course.currentLevel],
      );
      return aDistance - bDistance || a.order - b.order;
    })
    .slice(0, 5)
    .map((concept) => items.find((item) => item.id === concept.id)!);

  const categories = [...new Set(items.map((item) => item.category))];

  const counts = items.reduce(
    (result, item) => {
      result[item.status] += 1;
      return result;
    },
    {
      UNASSESSED: 0,
      ASSUMED: 0,
      LEARNING: 0,
      STRONG: 0,
      NEEDS_ATTENTION: 0,
    } satisfies Record<GrammarProgressStatus, number>,
  );

  const sortedItems = [...items].sort(
    (a, b) =>
      PROGRESS_PRIORITY[a.status] - PROGRESS_PRIORITY[b.status] ||
      a.order - b.order,
  );

  return {
    currentLevel: course.currentLevel,
    targetLevel: course.targetLevel,
    targetLanguage: course.targetLanguage,
    items,
    sortedItems,
    categories,
    counts,
    needsAttention,
    learning,
    recommended,
  };
}
