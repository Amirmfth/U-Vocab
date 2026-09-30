import { connection } from "next/server";
import type { ExerciseType } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpenText,
  MessageCircle,
  PenLine,
  Plus,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { buildExercise, eligibleExerciseTypes } from "@/lib/exercises/build";
import { buildGrammarPracticeSession } from "@/lib/exercises/grammar-session";
import { selectExerciseType } from "@/lib/exercises/select";
import { PracticeForm } from "./PracticeForm";
import { getVerbConjugationForUser } from "@/lib/ai/verb-conjugation";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { getServerTranslator } from "@/i18n/server";
import type { Translator } from "@/i18n/core";
import { PRACTICE_HUB_DESTINATIONS } from "@/lib/practice-hub";

function PracticeHub({ t }: { t: Translator }) {
  return (
    <main className="page practice-hub">

      <nav className="practice-lanes" aria-label={t("practice.skills")}>
        {PRACTICE_HUB_DESTINATIONS.map((destination) => {
          const Icon =
            destination.href === "/writing"
              ? PenLine
              : destination.href === "/reading"
                ? BookOpenText
                : destination.href === "/conversation"
                  ? MessageCircle
                  : Sparkles;
          return (
            <Link key={destination.href} href={destination.href} className="practice-lane">
              <span className="practice-lane-icon"><Icon size={30} /></span>
              <span className="practice-lane-copy">
                <strong>{t(destination.labelKey)}</strong>
              </span>
            </Link>
          );
        })}
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
  const user=await getCurrentUser();
  const { t }=await getServerTranslator(user);
  if(params.mixed==="1") redirect("/practice?drill=1");
  if(!params.lexeme&&params.drill!=="1"&&!params.grammar) return <PracticeHub t={t}/>;

  const course=await getCurrentCourse();

  if(params.grammar){
    const grammarExercises=await buildGrammarPracticeSession({
      userId:user.id,
      userCourseId:course.id,
      targetLanguage:course.targetLanguage,
      currentLevel:course.currentLevel,
      targetLevel:course.targetLevel,
      slug:params.grammar==="1"?null:params.grammar,
      limit:6,
    });

    if(!grammarExercises.length){
      return <main className="page focus-page">
        <section className="empty-state compact-empty">
          <strong>{t("practice.noGrammar")}</strong>
          <p className="muted">{t("practice.noGrammarHelp")}</p>
          <Link href="/grammar" className="button button-primary">{t("practice.chooseGrammar")}</Link>
          <Link href="/practice" className="text-link">{t("practice.back")}</Link>
        </section>
      </main>;
    }

    return <main className="page focus-page">
      <div className="focus-meta">
        <Link href="/grammar">{t("nav.grammar")}</Link>
        <span className={params.grammar==="1"?undefined:"learning-content"} lang={params.grammar==="1"?undefined:"de"} dir={params.grammar==="1"?undefined:"ltr"}>{params.grammar==="1"?t("practice.recommended"):grammarExercises[0].lemma}</span>
      </div>
      <PracticeForm exercises={grammarExercises}/>
    </main>;
  }
  const [items,distractorItems]=await Promise.all([
    db.userVocabulary.findMany({
    where:{ userCourseId:course.id,...(params.lexeme?{ lexemeId:params.lexeme }:{}) },
    include:{
      lexeme:{
        include:{
          patterns:true,
          translations:true,
          examples:true,
          mistakes:{
            where:{ userCourseId:course.id,resolvedAt:null },
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
      where:{ userCourseId:course.id },
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
        <strong>{params.lexeme?t("practice.wordNotFound"):t("practice.addToStart")}</strong>
        {!params.lexeme?<Link href="/vocabulary/new" className="button button-primary"><Plus size={18}/>{t("nav.addWord")}</Link>:null}
        <Link href="/practice" className="text-link">{t("practice.back")}</Link>
      </section>
    </main>;
  }

  const optionLanguage=course.explanationLanguage==="PERSIAN"?"fa":"en";
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
        ? buildExercise(preferred,item.lexeme,course.explanationLanguage,optionPools)
        : [preferred,...available.filter((type)=>type!==preferred)]
          .map((type)=>buildExercise(type,item.lexeme,course.explanationLanguage,optionPools))
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
        <strong>{t("practice.notEnoughChoices")}</strong>
        <p className="muted">{t("practice.addMore")}</p>
        <Link href="/vocabulary/new" className="button button-primary"><Plus size={18}/>{t("nav.addWord")}</Link>
      </section>
    </main>;
  }

  if(params.lexeme&&items[0].lexeme.partOfSpeech==="VERB"){
    const conjugation=await getVerbConjugationForUser({ userId:user.id,userCourseId:course.id,lexemeId:items[0].lexemeId });
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
            prompt:t("practice.verbPrompt"),
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
      <Link href="/practice">{t("nav.practice")}</Link>
      <span className={params.lexeme?"learning-content":undefined} lang={params.lexeme?"de":undefined} dir={params.lexeme?"ltr":undefined}>{params.lexeme?items[0].lexeme.lemma:t("practice.vocabulary")}</span>
    </div>
    <PracticeForm exercises={exercises}/>
  </main>;
}
