import type { ExerciseType } from "@prisma/client";
import { selectExerciseType } from "./select";
import type { LearnerSnapshot } from "./types";

const reviewFormats: ExerciseType[] = [
  "MEANING_RECALL",
  "REVERSE_RECALL",
  "CLOZE",
  "COLLOCATION",
  "CASE_PREPOSITION",
  "FREE_SENTENCE",
  "PARAPHRASE",
];

const productionFormats: ExerciseType[] = [
  "COLLOCATION",
  "CASE_PREPOSITION",
  "FREE_SENTENCE",
  "PARAPHRASE",
];

export function selectReviewExerciseType(
  snapshot: LearnerSnapshot,
  recentTypes: ExerciseType[],
) {
  const preferred = selectExerciseType(snapshot);
  const recentlyUsed = recentTypes.slice(0, 2);

  if (
    snapshot.recognition >= 0.75 &&
    snapshot.meaningRecall >= 0.75
  ) {
    const hard = productionFormats.find((type) => !recentlyUsed.includes(type));
    if (hard) return hard;
  }

  if (!recentTypes.includes(preferred)) return preferred;

  const suitable = reviewFormats.filter((type) => !recentlyUsed.includes(type));

  if (snapshot.production < 0.5) {
    return suitable.find((type) => productionFormats.includes(type)) ?? preferred;
  }

  return suitable[0] ?? preferred;
}
