import { connection } from "next/server";
import type { ExerciseType } from "@prisma/client";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  MessageCircle,
  PenLine,
  Plus,
  ScanText,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { buildExercise, eligibleExerciseTypes } from "@/lib/exercises/build";
import { selectExerciseType } from "@/lib/exercises/select";
import { PracticeForm } from "./PracticeForm";
import { getVerbConjugationForUser } from "@/lib/ai/verb-conjugation";

function PracticeHub() {
  return (
    <main className="page practice-hub">
      <section className="page-header compact practice-header">
        <p className="eyebrow">PRACTICE</p>
        <h1>Use your German</h1>
        <p className="page-description">
          Pick one skill and get into practice quickly.
        </p>
      </section>

      <nav className="practice-lanes" aria-label="Practice skills">
        <Link href="/writing" className="practice-lane">
          <span className="practice-lane-icon"><PenLine size={21} /></span>
          <span className="practice-lane-copy">
            <strong>Writing</strong>
            <small>Guided, open, exam-style, and rewrite practice</small>
          </span>
          <ArrowRight size={18} />
        </Link>

        <Link href="/read" className="practice-lane">
          <span className="practice-lane-icon"><ScanText size={21} /></span>
          <span className="practice-lane-copy">
            <strong>Reading</strong>
            <small>Paste text, revisit your library, and discover vocabulary</small>
          </span>
          <ArrowRight size={18} />
        </Link>

        <Link href="/conversation" className="practice-lane">
          <span className="practice-lane-icon"><MessageCircle size={21} /></span>
          <span className="practice-lane-copy">
            <strong>Speaking</strong>
            <small>Free conversation, scenarios, and vocabulary missions</small>
          </span>
          <ArrowRight size={18} />
        </Link>
      </nav>

      <section className="practice-shortcuts">
        <div className="practice-shortcuts-heading">
          <p className="eyebrow">MORE IN PRACTICE</p>
          <span>Secondary modes</span>
        </div>
        <div className="practice-shortcut-grid">
          <Link href="/stories">
            <BookOpenText size={17} />
            <span><strong>Stories</strong><small>Contextual reading</small></span>
          </Link>
          <Link href="/missions">
            <Target size={17} />
            <span><strong>Missions</strong><small>Goal-based speaking</small></span>
          </Link>
          <Link href="/practice?drill=1">
            <Sparkles size={17} />
            <span><strong>Quick drill</strong><small>Weak vocabulary</small></span>
          </Link>
          <Link href="/battles">
            <Swords size={17} />
            <span><strong>Battles</strong><small>Fast vocabulary mode</small></span>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ lexeme?: string; drill?: string }>;
}) {
  await connection();
  const params=await searchParams;
  if(!params.lexeme&&params.drill!=="1") return <PracticeHub/>;

  const user=await getCurrentUser();
  const items=await db.userVocabulary.findMany({
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
  });

  if(!items.length){
    return <main className="page focus-page">
      <section className="empty-state compact-empty">
        <strong>{params.lexeme?"Word not found in your vocabulary":"Add a word to start practicing"}</strong>
        {!params.lexeme?<Link href="/vocabulary/new" className="button button-primary"><Plus size={18}/>Add word</Link>:null}
        <Link href="/practice" className="text-link">Back to Practice</Link>
      </section>
    </main>;
  }

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
      const type=selectExerciseType(snapshot,available,recent);
      recent.push(type);
      exercises.push({
        id:item.id+":"+position+":"+type,
        userVocabularyId:item.id,
        lemma:item.lexeme.lemma,
        exercise:buildExercise(type,item.lexeme,user.preferredTranslation),
      });
    }
  }

  if(params.lexeme&&items[0].lexeme.partOfSpeech==="VERB"){
    const conjugation=await getVerbConjugationForUser({ userId:user.id,lexemeId:items[0].lexemeId });
    if(conjugation.status==="ok"){
      const form=conjugation.data.indicative.present.forms.find((row)=>row.person==="du");
      if(form){
        exercises.push({
          id:items[0].id+":verb-present-du",
          userVocabularyId:items[0].id,
          lemma:items[0].lexeme.lemma,
          conjugation:{ person:"du" },
          exercise:{
            type:"REVERSE_RECALL",
            prompt:"Conjugate “"+items[0].lexeme.lemma+"” for du in Präsens.",
            expected:form.form,
            interaction:"short_text",
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
      <span>{params.lexeme?items[0].lexeme.lemma:"Quick drill"}</span>
    </div>
    <PracticeForm exercises={exercises}/>
  </main>;
}
