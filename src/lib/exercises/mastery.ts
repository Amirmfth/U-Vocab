import type { ExerciseType } from "@prisma/client";
import type { ExerciseInteraction } from "./types";

export type MasteryDelta = Partial<{
  recognition:number;
  meaningRecall:number;
  production:number;
  contextualUsage:number;
}>;

export function practiceMasteryDelta(
  type:ExerciseType,
  correct:boolean,
  interaction:ExerciseInteraction,
):MasteryDelta {
  const gain=correct?(interaction==="choice"?0.035:0.065):-0.025;
  switch(type){
    case "MEANING_RECALL": return { recognition:gain/2,meaningRecall:gain };
    case "REVERSE_RECALL": return { meaningRecall:gain/2,production:gain };
    case "ARTICLE": return { recognition:gain/2,production:gain/2 };
    case "CLOZE": return { production:gain/2,contextualUsage:gain };
    case "CONTEXTUAL_CHOICE": return { contextualUsage:gain };
    case "CASE_PREPOSITION":
    case "COLLOCATION": return { production:gain,contextualUsage:gain/2 };
    default: return { production:gain };
  }
}

export function applyMasteryDelta(
  current:{ recognition:number;meaningRecall:number;production:number;contextualUsage:number },
  delta:MasteryDelta,
){
  const clamp=(value:number)=>Math.max(0,Math.min(1,value));
  return {
    recognition:delta.recognition===undefined?current.recognition:clamp(current.recognition+delta.recognition),
    meaningRecall:delta.meaningRecall===undefined?current.meaningRecall:clamp(current.meaningRecall+delta.meaningRecall),
    production:delta.production===undefined?current.production:clamp(current.production+delta.production),
    contextualUsage:delta.contextualUsage===undefined?current.contextualUsage:clamp(current.contextualUsage+delta.contextualUsage),
  };
}


export type ReviewGradeLike="AGAIN"|"HARD"|"GOOD"|"EASY";

export function reviewMasteryDelta(type:ExerciseType,grade:ReviewGradeLike):MasteryDelta {
  const recall=grade==="AGAIN"?-0.03:grade==="HARD"?0.03:grade==="GOOD"?0.06:0.09;
  const delta:MasteryDelta={ meaningRecall:recall };
  if(["REVERSE_RECALL","ARTICLE","COLLOCATION","CASE_PREPOSITION"].includes(type)){
    delta.production=recall/2;
  }
  if(["CLOZE","CONTEXTUAL_CHOICE","CASE_PREPOSITION","COLLOCATION"].includes(type)){
    delta.contextualUsage=recall/2;
  }
  if(type==="MEANING_RECALL") delta.recognition=recall/3;
  return delta;
}
