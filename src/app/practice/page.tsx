import { connection } from "next/server";
import type { ExerciseType } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpenText,
  MessageCircle,
  GraduationCap,
  PenLine,
  Plus,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { buildExercise, eligibleExerciseTypes } from "@/lib/exercises/build";
import { buildGrammarPracticeSession } from "@/lib/exercises/grammar-session";
import { selectExerciseType } from "@/lib/exercises/select";
import { PracticeForm } from "./PracticeForm";
import { getVerbConjugationForUser } from "@/lib/ai/verb-conjugation";
import { formatLexemeLabel } from "@/lib/lexeme-display";

function PracticeHub() {
  return (
    <main className="page practice-hub">

      <nav className="practice-lanes" aria-label="Practice skills">
        <Link href="/grammar" className="practice-lane practice-lane-grammar">
          <span className="practice-lane-icon"><GraduationCap size={30} /></span>
          <span className="practice-lane-copy">
            <strong>Grammar</strong>
          </span>
        </Link>

        <Link href="/practice?drill=1" className="practice-lane">
          <span className="practice-lane-icon"><Sparkles size={30} /></span>
          <span className="practice-lane-copy">
            <strong>Vocabulary</strong>
          </span>
        </Link>

        <Link href="/writing" className="practice-lane">
          <span className="practice-lane-icon"><PenLine size={30} /></span>
          <span className="practice-lane-copy">
            <strong>Writing</strong>
          </span>
        </Link>

        <Link href="/reading" className="practice-lane">
          <span className="practice-lane-icon"><BookOpenText size={30} /></span>
          <span className="practice-lane-copy">
            <strong>Reading</strong>
          </span>
        </Link>

        <Link href="/conversation" className="practice-lane">
          <span className="practice-lane-icon"><MessageCircle size={30} /></span>
          <span className="practice-lane-copy">
            <strong>Speaking</strong>
          </span>
        </Link>
      </nav>
    </main>
  );
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ lexeme?: string; drill?: string; grammar?: string; mixed?: string }>;
}) {
  await connection();
  const params=await searchParams;
  if(params.mixed==="1") redirect("/practice?drill=1");
  if(!params.lexeme&&params.drill!=="1"&&!params.grammar) return <PracticeHub/>;

  const user=await getCurrentUser();

  if(params.grammar){
    const grammarExercises=await buildGrammarPracticeSession({
      userId:user.id,
      currentLevel:user.currentLevel,
      targetLevel:user.targetLevel,
      slug:params.grammar==="1"?null:params.grammar,
      limit:6,
    });

    if(!grammarExercises.length){
      return <main className="page focus-page">
        <section className="empty-state compact-empty">
          <strong>No deterministic practice is available for this grammar target yet.</strong>
          <p className="muted">Try another concept from Grammar. More exercise families can be added without changing the practice engine.</p>
          <Link href="/grammar" className="button button-primary">Choose grammar</Link>
          <Link href="/practice" className="text-link">Back to Practice</Link>
        </section>
      </main>;
    }

    return <main className="page focus-page">
      <div className="focus-meta">
        <Link href="/grammar">Grammar</Link>
        <span>{params.grammar==="1"?"Recommended practice":grammarExercises[0].lemma}</span>
      </div>
      <PracticeForm exercises={grammarExercises}/>
    </main>;
  }
  const [items,distractorItems]=await Promise.all([
    db.userVocabulary.findMany({
    where:{ userId:user.id,...(params.lexeme?{ lexemeId:params.lexeme }:{}) },
    include:{
      lexeme:{
        include:{
          patterns:true,
          translations:true,
          examples:true,
          mistakes:{
            where:{ userId:user.id,resolvedAt:null },
            select:{ type:true },
          },
        },
      },
    },
    orderBy:[
      { production:"asc" },
      { contextualUsage:"asc" },
      { meaningRecall:"asc" },
      { addedAt:"asc" },
    ],
    take:params.lexeme?1:8,
  }),
    db.userVocabulary.findMany({
      where:{ userId:user.id },
      include:{
        lexeme:{
          include:{ patterns:true,translations:true,examples:true },
        },
      },
      orderBy:{ addedAt:"desc" },
      take:200,
    }),
  ]);

  if(!items.length){
    return <main className="page focus-page">
      <section className="empty-state compact-empty">
        <strong>{params.lexeme?"Word not found in your vocabulary":"Add a word to start practicing"}</strong>
        {!params.lexeme?<Link href="/vocabulary/new" className="button button-primary"><Plus size={18}/>Add word</Link>:null}
        <Link href="/practice" className="text-link">Back to Practice</Link>
      </section>
    </main>;
  }

  const optionLanguage=user.preferredTranslation==="PERSIAN"?"fa":"en";
  const optionPools={
    meanings:distractorItems.flatMap((item)=>
      item.lexeme.translations
        .filter((translation)=>translation.language===optionLanguage)
        .map((translation)=>translation.text),
    ),
    lemmas:distractorItems.map((item)=>formatLexemeLabel(item.lexeme)),
    patterns:distractorItems.flatMap((item)=>item.lexeme.patterns.map((pattern)=>pattern.pattern)),
    examples:distractorItems.flatMap((item)=>item.lexeme.examples.map((example)=>example.german)),
  };

  const recent:ExerciseType[]=[];
  const exercises:Array<{
    id:string;
    userVocabularyId:string;
    lemma:string;
    exercise:ReturnType<typeof buildExercise>;
    conjugation?:{ person:string };
  }>=[];

  for(const item of items){
    const snapshot={
      recognition:item.recognition,
      meaningRecall:item.meaningRecall,
      production:item.production,
      contextualUsage:item.contextualUsage,
      mistakeTypes:item.lexeme.mistakes.map((mistake)=>mistake.type),
    };
    const available=eligibleExerciseTypes(item.lexeme);
    const count=params.lexeme?Math.min(6,Math.max(3,available.length+1)):1;
    for(let position=0;position<count;position+=1){
      const preferred=selectExerciseType(snapshot,available,recent);
      const choice=params.lexeme
        ? buildExercise(preferred,item.lexeme,user.preferredTranslation,optionPools)
        : [preferred,...available.filter((type)=>type!==preferred)]
          .map((type)=>buildExercise(type,item.lexeme,user.preferredTranslation,optionPools))
          .find((exercise)=>exercise.interaction==="choice"&&(exercise.options?.length??0)>=2);
      if(!choice) continue;
      recent.push(choice.type);
      exercises.push({
        id:item.id+":"+position+":"+choice.type,
        userVocabularyId:item.id,
        lemma:item.lexeme.lemma,
        exercise:choice,
      });
    }
  }

  if(!params.lexeme&&!exercises.length){
    return <main className="page focus-page">
      <section className="empty-state compact-empty">
        <strong>Not enough distinct answer choices for vocabulary practice yet.</strong>
        <p className="muted">Add more vocabulary to unlock multiple-choice practice.</p>
        <Link href="/vocabulary/new" className="button button-primary"><Plus size={18}/>Add word</Link>
      </section>
    </main>;
  }

  if(params.lexeme&&items[0].lexeme.partOfSpeech==="VERB"){
    const conjugation=await getVerbConjugationForUser({ userId:user.id,lexemeId:items[0].lexemeId });
    if(conjugation.status==="ok"){
      const form=conjugation.data.indicative.present.forms.find((row)=>row.person==="du");
      if(form){
        const verbOptions=Array.from(new Set([
          form.form,
          ...conjugation.data.indicative.present.forms.map((row)=>row.form),
        ])).slice(0,4);
        exercises.push({
          id:items[0].id+":verb-present-du",
          userVocabularyId:items[0].id,
          lemma:items[0].lexeme.lemma,
          conjugation:{ person:"du" },
          exercise:{
            type:"REVERSE_RECALL",
            prompt:"Which form is correct for du in Präsens?",
            expected:form.form,
            interaction:verbOptions.length>=3?"choice":"short_text",
            options:verbOptions.length>=3?verbOptions:undefined,
            skill:"production",
            requiresAI:false,
          },
        });
      }
    }
  }

  return <main className="page focus-page">
    <div className="focus-meta">
      <Link href="/practice">Practice</Link>
      <span>{params.lexeme?items[0].lexeme.lemma:"Vocabulary"}</span>
    </div>
    <PracticeForm exercises={exercises}/>
  </main>;
}
