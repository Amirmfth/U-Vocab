"use server";

import type { ExerciseType, MistakeType } from "@prisma/client";
import type { ExerciseInteraction } from "@/lib/exercises/types";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { buildExercise } from "@/lib/exercises/build";
import { checkDeterministicAnswer } from "@/lib/exercises/check";
import { applyMasteryDelta, practiceMasteryDelta } from "@/lib/exercises/mastery";
import {
  buildGrammarExercise,
  grammarEvidenceDimension,
  grammarMistakeType,
} from "@/lib/exercises/grammar";
import { recordMistakes } from "@/lib/mistakes";
import {
  recordGrammarMistake,
  resolveGrammarMistakes,
} from "@/lib/grammar/mistakes";
import { recordGrammarEvidence } from "@/lib/grammar/learner-model";
import { instrumentOperation } from "@/lib/performance";
import { revalidateUserDomains } from "@/lib/cache-tags";
import { getVerbConjugationForUser } from "@/lib/ai/verb-conjugation";

export type PracticeAnswerInput={
  userVocabularyId?:string|null;
  grammarConceptId?:string|null;
  grammarVariant?:string|null;
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

function durationFrom(startedAt:number) {
  return Number.isFinite(startedAt)&&startedAt>0
    ?Math.max(0,Math.min(Date.now()-startedAt,30*60*1000))
    :null;
}

async function submitGrammarAnswer(
  userId:string,
  input:PracticeAnswerInput,
  answer:string,
):Promise<PracticeAnswerResult> {
  const grammarConceptId=input.grammarConceptId;
  const grammarVariant=input.grammarVariant;
  if(!grammarConceptId||!grammarVariant) {
    return { status:"error",message:"Grammar practice target is missing." };
  }

  const concept=await db.grammarConcept.findFirst({
    where:{ id:grammarConceptId,active:true,language:"de" },
    select:{ id:true },
  });
  if(!concept) return { status:"error",message:"Grammar concept not found." };

  let item:null|{
    id:string;
    lexemeId:string;
    lexeme:{ id:string;lemma:string;article:string|null };
  }=null;
  let linkedLexeme:null|{
    id:string;
    lemma:string;
    article:string|null;
    pattern:string|null;
  }=null;

  if(input.userVocabularyId){
    item=await db.userVocabulary.findFirst({
      where:{ id:input.userVocabularyId,userId },
      select:{
        id:true,
        lexemeId:true,
        lexeme:{ select:{ id:true,lemma:true,article:true } },
      },
    });
    if(!item) return { status:"error",message:"Linked vocabulary item not found." };
    const link=await db.lexemeGrammarConcept.findFirst({
      where:{ lexemeId:item.lexemeId,grammarConceptId },
      include:{ lexicalPattern:{ select:{ pattern:true } } },
      orderBy:[{ confidence:"desc" },{ createdAt:"asc" }],
    });
    if(!link) return { status:"error",message:"Vocabulary item is not linked to this grammar concept." };
    linkedLexeme={
      id:item.lexeme.id,
      lemma:item.lexeme.lemma,
      article:item.lexeme.article,
      pattern:link.lexicalPattern?.pattern??null,
    };
  }

  const exercise=buildGrammarExercise(grammarConceptId,grammarVariant,linkedLexeme);
  if(!exercise||exercise.type!==input.exerciseType) {
    return { status:"error",message:"Grammar exercise is no longer available." };
  }

  const evaluation=checkDeterministicAnswer(answer,exercise.expected);
  const type=grammarMistakeType(grammarConceptId,grammarVariant);
  const attempt=await db.attempt.create({
    data:{
      userId,
      userVocabularyId:item?.id??null,
      grammarConceptId,
      exerciseType:exercise.type,
      prompt:exercise.prompt,
      answer,
      expected:exercise.expected,
      correct:evaluation.correct,
      score:evaluation.score,
      feedback:evaluation.feedback,
      durationMs:durationFrom(input.startedAt),
    },
  });

  if(evaluation.correct){
    await resolveGrammarMistakes({
      userId,
      grammarConceptId,
      lexemeId:item?.lexemeId??null,
      type,
    });
  }else{
    await recordGrammarMistake({
      userId,
      grammarConceptId,
      lexemeId:item?.lexemeId??null,
      type,
      expected:exercise.expected,
      actual:answer,
      explanation:evaluation.feedback,
    });
  }

  await recordGrammarEvidence({
    userId,
    grammarConceptId,
    source:"PRACTICE",
    outcome:evaluation.correct?"SUCCESS":"ERROR",
    dimension:grammarEvidenceDimension(grammarConceptId,grammarVariant),
    strength:input.interaction==="choice"?0.75:1,
    confidence:1,
    dedupeKey:"practice:"+attempt.id,
    sourceRef:attempt.id,
    excerpt:exercise.prompt.slice(0,240),
    metadata:{
      exerciseType:exercise.type,
      variant:grammarVariant,
      ...(item?.lexemeId ? { linkedLexemeId:item.lexemeId } : {}),
    },
  });

  revalidateUserDomains(
    userId,
    ["home","progress","mistakes"],
    item?.lexemeId?[item.lexemeId]:[],
  );

  return {
    status:"success",
    correct:evaluation.correct,
    feedback:evaluation.feedback,
    expected:exercise.expected,
  };
}

export async function submitPracticeAnswer(input:PracticeAnswerInput):Promise<PracticeAnswerResult>{
  const answer=input.answer.trim();
  if(!answer) return { status:"error",message:"Enter an answer before continuing." };

  return instrumentOperation("practice.evaluate",{ exerciseType:input.exerciseType,requiresAI:false },async(perf)=>{
    const user=await perf.span("auth",()=>getCurrentUser());

    if(input.grammarConceptId){
      return perf.span("grammar",()=>submitGrammarAnswer(user.id,input,answer));
    }

    if(!input.userVocabularyId) {
      return { status:"error",message:"Practice target is missing." };
    }
    const userVocabularyId=input.userVocabularyId;

    const item=await perf.span("dbRead",()=>db.userVocabulary.findFirst({
      where:{ id:userVocabularyId,userId:user.id },
      include:{ lexeme:{ include:{ patterns:true,translations:true,examples:true } } },
    }));
    if(!item) return { status:"error",message:"Vocabulary item not found." };

    let exercise=buildExercise(input.exerciseType,item.lexeme,course.explanationLanguage);
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
          durationMs:durationFrom(input.startedAt),
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
