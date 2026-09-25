import type { ExerciseType } from "@prisma/client";
import { selectExerciseType } from "./select";
import type { LearnerSnapshot } from "./types";

const reviewFormats:ExerciseType[]=[
  "MEANING_RECALL",
  "REVERSE_RECALL",
  "CLOZE",
  "COLLOCATION",
  "CASE_PREPOSITION",
  "CONTEXTUAL_CHOICE",
];

export function selectReviewExerciseType(
  snapshot:LearnerSnapshot,
  recentTypes:ExerciseType[],
){
  return selectExerciseType(snapshot,reviewFormats,recentTypes);
}
