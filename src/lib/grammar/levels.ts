import type { CefrLevel } from "@prisma/client";

export const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const CEFR_RANK: Record<CefrLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

export function isValidCefrLevel(value: string): value is CefrLevel {
  return CEFR_LEVELS.includes(value as CefrLevel);
}

export function targetLevelIsValid(
  currentLevel: CefrLevel,
  targetLevel: CefrLevel,
) {
  return CEFR_RANK[targetLevel] >= CEFR_RANK[currentLevel];
}

export function isConceptAssumedForLevel(
  currentLevel: CefrLevel,
  introducedAt: CefrLevel,
  expectedBy: CefrLevel | null,
) {
  const effectiveExpectedLevel = expectedBy ?? introducedAt;
  return CEFR_RANK[effectiveExpectedLevel] < CEFR_RANK[currentLevel];
}
