import type { ExerciseType, TranslationLanguage } from "@prisma/client";
import { isTranslationVisible } from "@/lib/translations";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import type { ExerciseLexeme, LearnerSnapshot } from "@/lib/exercises/types";

export type ReviewCardFamily=
  | "GERMAN_MEANING"
  | "MEANING_GERMAN";

export type ReviewCardDefinition={
  family:ReviewCardFamily;
  exerciseType:ExerciseType;
  front:{ prompt:string;hint?:string };
  back:{ answer:string;details:string[] };
};

function meaning(lexeme:ExerciseLexeme,preference:TranslationLanguage){
  return lexeme.translations.find((item)=>isTranslationVisible(preference,item.language))?.text
    ??lexeme.translations[0]?.text
    ??"";
}

export function buildReviewCard(input:{
  lexeme:ExerciseLexeme;
  preference:TranslationLanguage;
  snapshot:LearnerSnapshot;
  recentTypes:ExerciseType[];
}):ReviewCardDefinition{
  const { lexeme,snapshot,recentTypes }=input;
  const translated=meaning(lexeme,input.preference);
  const label=formatLexemeLabel(lexeme);
  const pattern=lexeme.patterns[0]?.pattern;
  if(snapshot.production<snapshot.meaningRecall||recentTypes[0]==="MEANING_RECALL"){
    return {
      family:"MEANING_GERMAN",
      exerciseType:"REVERSE_RECALL",
      front:{ prompt:translated||"Recall the German lexical unit.",hint:lexeme.partOfSpeech.toLowerCase() },
      back:{ answer:label,details:pattern?[pattern]:[] },
    };
  }

  return {
    family:"GERMAN_MEANING",
    exerciseType:"MEANING_RECALL",
    front:{ prompt:label },
    back:{
      answer:translated,
      details:[
        pattern??"",
        lexeme.examples[0]?.german??"",
      ].filter(Boolean),
    },
  };
}
