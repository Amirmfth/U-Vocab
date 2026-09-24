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

export function selectReviewExerciseType(
  snapshot: LearnerSnapshot,
  recentTypes: ExerciseType[],
) {
  const preferred = selectExerciseType(snapshot);
  if (!recentTypes.includes(preferred)) return preferred;

  const suitable = reviewFormats.filter((type) => !recentTypes.slice(0, 2).includes(type));

  if (snapshot.production < 0.5) {
    return suitable.find((type) =>
      ["FREE_SENTENCE", "PARAPHRASE", "COLLOCATION", "CASE_PREPOSITION"].includes(type),
    ) ?? preferred;
  }

  return suitable[0] ?? preferred;
}
