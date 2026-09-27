import type { GrammarProgressStatus } from "@prisma/client";
import type { GrammarExerciseVariant } from "./grammar";

export const GRAMMAR_STATUS_PRIORITY: Record<GrammarProgressStatus, number> = {
  NEEDS_ATTENTION: 0,
  LEARNING: 1,
  UNASSESSED: 2,
  ASSUMED: 3,
  STRONG: 4,
};

export function grammarPrerequisitesReady(
  prerequisiteIds: string[],
  statusByConcept: ReadonlyMap<string, GrammarProgressStatus>,
  explicitlyTargeted = false,
) {
  if (explicitlyTargeted) return true;
  return prerequisiteIds.every((id) => {
    const status = statusByConcept.get(id) ?? "UNASSESSED";
    return status === "ASSUMED" || status === "STRONG";
  });
}

export function orderGrammarVariants(
  variants: GrammarExerciseVariant[],
  progress: { understanding: number } | null,
) {
  return [...variants].sort((a, b) => {
    if (!progress) {
      if (a.dimension === b.dimension) return 0;
      if (a.dimension === "UNDERSTANDING") return -1;
      if (b.dimension === "UNDERSTANDING") return 1;
      return 0;
    }
    if (progress.understanding < 0.5 && a.dimension !== b.dimension) {
      if (a.dimension === "UNDERSTANDING") return -1;
      if (b.dimension === "UNDERSTANDING") return 1;
    }
    if (a.dimension === b.dimension) return 0;
    if (a.dimension === "CONTROLLED_PRODUCTION") return -1;
    if (b.dimension === "CONTROLLED_PRODUCTION") return 1;
    return 0;
  });
}
