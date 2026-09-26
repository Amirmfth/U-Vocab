"use server";

import type { ExerciseType, MistakeType } from "@prisma/client";
import type { ExerciseInteraction } from "@/lib/exercises/types";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { buildExercise } from "@/lib/exercises/build";
import { checkDeterministicAnswer } from "@/lib/exercises/check";
import { applyMasteryDelta, practiceMasteryDelta } from "@/lib/exercises/mastery";
import { recordMistakes } from "@/lib/mistakes";
import { instrumentOperation } from "@/lib/performance";
import { revalidateUserDomains } from "@/lib/cache-tags";
import { getVerbConjugationForUser } from "@/lib/ai/verb-conjugation";

export type PracticeAnswerInput={
  userVocabularyId:string;
  exerciseType:ExerciseType;
  answer:string;
  startedAt:number;
  conjugation?:{ person:string };
  interaction:ExerciseInteraction;
};

export type PracticeAnswerResult=
  | { status:"success";correct:boolean;feedback:string;expected:string }
  | { status:"error";message:string };

function mistakeType(type:ExerciseType):MistakeType {
  if(type==="ARTICLE") return "ARTICLE";
  if(type==="CASE_PREPOSITION") return "PREPOSITION";
  if(type==="COLLOCATION") return "COLLOCATION";
  if(type==="CONTEXTUAL_CHOICE") return "WORD_CHOICE";
  if(type==="CLOZE"||type==="REVERSE_RECALL") return "WORD_FORM";
  return "OTHER";
}

export async function submitPracticeAnswer(input:PracticeAnswerInput):Promise<PracticeAnswerResult>{
  const answer=input.answer.trim();
  if(!input.userVocabularyId||!answer) return { status:"error",message:"Enter an answer before continuing." };

  return instrumentOperation("practice.evaluate",{ exerciseType:input.exerciseType,requiresAI:false },async(perf)=>{
    const user=await perf.span("auth",()=>getCurrentUser());
    const item=await perf.span("dbRead",()=>db.userVocabulary.findFirst({
      where:{ id:input.userVocabularyId,userId:user.id },
      include:{ lexeme:{ include:{ patterns:true,translations:true,examples:true } } },
    }));
    if(!item) return { status:"error",message:"Vocabulary item not found." };

    let exercise=buildExercise(input.exerciseType,item.lexeme,user.preferredTranslation);
    if(input.conjugation){
      const conjugation=await getVerbConjugationForUser({ userId:user.id,lexemeId:item.lexemeId });
      if(conjugation.status!=="ok") return { status:"error",message:"Verb conjugation is unavailable." };
      const row=conjugation.data.indicative.present.forms.find((form)=>form.person===input.conjugation?.person);
      if(!row) return { status:"error",message:"Requested verb form is unavailable." };
      exercise={
        type:"REVERSE_RECALL",
        prompt:"Conjugate “"+item.lexeme.lemma+"” for "+row.person+" in Präsens.",
        expected:row.form,
        interaction:"short_text",
        skill:"production",
        requiresAI:false,
      };
    }
    const evaluation=checkDeterministicAnswer(answer,exercise.expected);
    const durationMs=Number.isFinite(input.startedAt)&&input.startedAt>0
      ?Math.max(0,Math.min(Date.now()-input.startedAt,30*60*1000))
      :null;
    const interaction:ExerciseInteraction=input.interaction==="choice"?"choice":"short_text";
    const delta=practiceMasteryDelta(exercise.type,evaluation.correct,interaction);
    const mastery=applyMasteryDelta(item,delta);
    const type=mistakeType(exercise.type);

    await perf.span("dbWrite",async()=>{
      await db.attempt.create({
        data:{
          userId:user.id,
          userVocabularyId:item.id,
          exerciseType:exercise.type,
          prompt:exercise.prompt,
          answer,
          expected:exercise.expected,
          correct:evaluation.correct,
          score:evaluation.score,
          feedback:evaluation.feedback,
          durationMs,
        },
      });

      if(evaluation.correct){
        if(type!=="OTHER"){
          await db.mistake.updateMany({
            where:{ userId:user.id,lexemeId:item.lexemeId,type,resolvedAt:null },
            data:{ resolvedAt:new Date() },
          });
        }
      }else{
        await recordMistakes(db,{
          userId:user.id,
          lexemeId:item.lexemeId,
          mistakes:[{
            type,
            expected:exercise.expected,
            actual:answer,
            explanation:evaluation.feedback,
          }],
        });
      }

      await db.userVocabulary.update({ where:{ id:item.id },data:mastery });
    });

    revalidateUserDomains(user.id,["home","vocabulary","progress","mistakes"],[item.lexemeId]);
    return {
      status:"success",
      correct:evaluation.correct,
      feedback:evaluation.feedback,
      expected:exercise.expected,
    };
  });
}
