import type { ExerciseType } from "@prisma/client";
import type { LearnerSnapshot } from "./types";

const productionTypes: ExerciseType[] = [
  "FREE_SENTENCE",
  "PARAPHRASE",
  "CASE_PREPOSITION",
  "COLLOCATION",
];

export function selectExerciseType(snapshot: LearnerSnapshot): ExerciseType {
  if (snapshot.mistakeTypes.includes("ARTICLE")) return "ARTICLE";
  if (
    snapshot.mistakeTypes.includes("CASE") ||
    snapshot.mistakeTypes.includes("PREPOSITION") ||
    snapshot.mistakeTypes.includes("REFLEXIVE")
  ) return "CASE_PREPOSITION";
  if (snapshot.mistakeTypes.includes("COLLOCATION")) return "COLLOCATION";

  if (snapshot.production + 0.15 < snapshot.meaningRecall) {
    return productionTypes[Math.floor(snapshot.production * 10) % productionTypes.length];
  }
  if (snapshot.contextualUsage < 0.45) return "CLOZE";
  if (snapshot.meaningRecall < 0.4) return "REVERSE_RECALL";
  if (snapshot.recognition < 0.5) return "MEANING_RECALL";
  return "FREE_SENTENCE";
}
