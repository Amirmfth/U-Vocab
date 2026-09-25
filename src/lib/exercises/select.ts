import type { ExerciseType } from "@prisma/client";
import type { LearnerSnapshot } from "./types";

const fallback: ExerciseType[]=["REVERSE_RECALL","MEANING_RECALL"];

export function selectExerciseType(
  snapshot: LearnerSnapshot,
  available: ExerciseType[]=fallback,
  recent: ExerciseType[]=[],
): ExerciseType {
  const has=(type:ExerciseType)=>available.includes(type);
  const pick=(types:ExerciseType[])=>types.find((type)=>has(type)&&!recent.slice(-2).includes(type))
    ?? types.find(has)
    ?? available.find((type)=>!recent.slice(-2).includes(type))
    ?? available[0]
    ?? "REVERSE_RECALL";

  if(snapshot.mistakeTypes.includes("ARTICLE")&&has("ARTICLE")) return "ARTICLE";
  if(snapshot.mistakeTypes.some((type)=>["CASE","PREPOSITION","REFLEXIVE"].includes(type))&&has("CASE_PREPOSITION")) return "CASE_PREPOSITION";
  if(snapshot.mistakeTypes.includes("COLLOCATION")&&has("COLLOCATION")) return "COLLOCATION";

  if(snapshot.meaningRecall<0.42) return pick(["MEANING_RECALL","REVERSE_RECALL"]);
  if(snapshot.production<0.52) return pick(["REVERSE_RECALL","COLLOCATION","CASE_PREPOSITION"]);
  if(snapshot.contextualUsage<0.58) return pick(["CLOZE","CONTEXTUAL_CHOICE"]);
  if(snapshot.recognition<0.6) return pick(["MEANING_RECALL","CONTEXTUAL_CHOICE"]);
  return pick(["CLOZE","REVERSE_RECALL","CONTEXTUAL_CHOICE","COLLOCATION","MEANING_RECALL"]);
}
