import type { ExerciseType, TranslationLanguage } from "@prisma/client";
import { isTranslationVisible } from "@/lib/translations";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { buildCloze } from "@/lib/exercises/build";
import type { ExerciseLexeme, LearnerSnapshot } from "@/lib/exercises/types";

export type ReviewCardFamily=
  | "GERMAN_MEANING"
  | "MEANING_GERMAN"
  | "CONTEXT_CLOZE"
  | "GRAMMAR_PATTERN";

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
  const cloze=lexeme.examples.map((item)=>buildCloze(item.german,lexeme.lemma)).find(Boolean);

  if(pattern&&snapshot.mistakeTypes.some((type)=>["CASE","PREPOSITION","REFLEXIVE","COLLOCATION"].includes(type))){
    return {
      family:"GRAMMAR_PATTERN",
      exerciseType:snapshot.mistakeTypes.includes("COLLOCATION")?"COLLOCATION":"CASE_PREPOSITION",
      front:{ prompt:"Recall the grammar / lexical pattern for “"+lexeme.lemma+"”." },
      back:{ answer:pattern,details:[translated].filter(Boolean) },
    };
  }

  if(cloze&&snapshot.contextualUsage<0.5&&!recentTypes.slice(0,2).includes("CLOZE")){
    return {
      family:"CONTEXT_CLOZE",
      exerciseType:"CLOZE",
      front:{ prompt:cloze.prompt },
      back:{ answer:cloze.expected,details:[label,translated].filter(Boolean) },
    };
  }

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
