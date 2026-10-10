"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import type { ExerciseDefinition } from "@/lib/exercises/types";
import { checkDeterministicAnswer } from "@/lib/exercises/check";
import { StatusNotice } from "@/components/status-notice";
import { submitPracticeAnswer, type PracticeAnswerResult } from "./actions";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";

export type PracticeSessionExercise={
  id:string;
  userVocabularyId:string|null;
  grammarConceptId?:string;
  grammarVariant?:string;
  lemma:string;
  retry?:boolean;
  exercise:ExerciseDefinition;
  conjugation?:{ person:string };
};

export function PracticeForm({ exercises }:{ exercises:PracticeSessionExercise[] }){
  const [queue,setQueue]=useState(exercises);
  const [index,setIndex]=useState(0);
  const [answer,setAnswer]=useState("");
  const [selected,setSelected]=useState<string|null>(null);
  const [result,setResult]=useState<PracticeAnswerResult|null>(null);
  const [history,setHistory]=useState<Array<{ correct:boolean;skill:string }>>([]);
  const [saveError,setSaveError]=useState<string|null>(null);
  const reduceMotion=useReducedMotion();
  const startedAt=useRef(Date.now());
  const current=queue[index];
  const { locale, t }=useI18n();

  useEffect(()=>{
    if(result?.status!=="success") return;
    const delay=result.correct?850:1150;
    const timer=window.setTimeout(()=>{
      setIndex((value)=>value+1);
      setAnswer("");
      setSelected(null);
      setResult(null);
      setSaveError(null);
      startedAt.current=Date.now();
    },delay);
    return ()=>window.clearTimeout(timer);
  },[result]);

  function submit(value:string){
    if(!current||result?.status==="success") return;
    setSelected(value);
    const evaluation=checkDeterministicAnswer(value,current.exercise.expected);
    const response:PracticeAnswerResult={
      status:"success",
      correct:evaluation.correct,
      feedback:evaluation.feedback,
      expected:current.exercise.expected,
    };
    setResult(response);
    setHistory((items)=>[...items,{ correct:response.correct,skill:current.exercise.skill }]);
    if(!response.correct&&!current.retry){
      setQueue((items)=>[...items,{ ...current,id:current.id+"-retry",retry:true }]);
    }

    // Feedback uses the answer delivered with this question. The server still
    // rebuilds and independently validates the exercise before saving it.
    void submitPracticeAnswer({
      userVocabularyId:current.userVocabularyId,
      grammarConceptId:current.grammarConceptId??null,
      grammarVariant:current.grammarVariant??null,
      exerciseType:current.exercise.type,
      answer:value,
      startedAt:startedAt.current,
      conjugation:current.conjugation,
      interaction:current.exercise.interaction,
    }).catch((error)=>{
        if(error instanceof Error&&error.message.includes("Unauthorized")){
          window.location.assign("/login?returnTo="+encodeURIComponent(window.location.pathname+window.location.search));
          return;
        }
        setSaveError(t("practice.saveError"));
    });
  }

  if(!current){
    const correct=history.filter((item)=>item.correct).length;
    const skills=[...new Set(history.map((item)=>item.skill))];
    return <section className="panel practice-complete uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-4 rounded-uv-r6d27d54c6c">
      <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("practice.sessionComplete")}</p>
      <h1>{t("practice.correctCount",{ correct:formatNumber(locale,correct),total:formatNumber(locale,history.length) })}</h1>
      <p className="muted text-uv-text-muted">{t("practice.practiced",{ skills:skills.join(", ")||t("practice.vocabulary").toLowerCase() })}</p>
      <div className="ia-empty-actions flex flex-col gap-2 uv-min620:flex-row uv-min620:items-center">
        <Link className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" href={exercises.some((item)=>item.grammarConceptId)?"/practice?grammar=1":"/practice?drill=1"}><RotateCcw size={17}/> {t("practice.anotherSet")}</Link>
        {exercises.some((item)=>item.grammarConceptId)?<Link className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" href="/grammar">{t("practice.backGrammar")}</Link>:<Link className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" href="/review">{t("practice.reviewDue")}</Link>}
        <Link className="text-link text-uv-primary-strong uv-weight-560 inline-flex items-center gap-1.5" href={exercises.some((item)=>item.grammarConceptId)?"/practice":"/vocabulary"}>{exercises.some((item)=>item.grammarConceptId)?t("practice.back"):t("practice.backWords")}</Link>
      </div>
    </section>;
  }

  const progress=Math.min(100,Math.round((index/Math.max(queue.length,1))*100));
  const success=result?.status==="success";

  return <div className="practice-session-stage flex flex-col gap-3">
    <div className="practice-progress grid uv-grid-template-columns-bf99fa7d2d items-center gap-2.5 text-uv-text-muted text-uv-fbcf5b95460">
      <span>{formatNumber(locale,Math.min(index+1,queue.length))} / {formatNumber(locale,queue.length)}</span>
      <div className="metric-bar h-1.75 overflow-hidden rounded-uv-red9ab892c5 bg-uv-surface-soft uv-v22810335d8:block uv-v22810335d8:h-full uv-v22810335d8:rounded-uv-r3e26d67509 uv-v22810335d8:bg-uv-primary"><span style={{ width:progress+"%" }}/></div>
    </div>

    <AnimatePresence mode="wait" initial={false}>
      <motion.section
        key={current.id}
        className="panel learning-card practice-session-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 w-full max-w-uv-c078f10a0b uv-vbc4e530e94:text-uv-f128d50102f flex flex-col gap-4 uv-v8cd0743a41:flex uv-v8cd0743a41:flex-col uv-v8cd0743a41:gap-3 uv-vcf5ce320fa:min-h-12.5 rounded-uv-r6d27d54c6c"
        initial={reduceMotion?false:{ opacity:0,x:28,scale:.99 }}
        animate={{ opacity:1,x:0,scale:1 }}
        exit={reduceMotion?{ opacity:0 }:{ opacity:0,x:-34,scale:.985 }}
        transition={{ duration:reduceMotion?0:.2,ease:"easeOut" }}
      >
        <div className="learning-card-head flex items-center justify-between gap-3 uv-va472f14696:text-uv-fe9d5fd6635">
          <span className="exercise-type text-uv-text-muted text-uv-f63777cce16 capitalize">{current.exercise.type.replaceAll("_"," ").toLowerCase()}</span>
          <span className="muted learning-content text-uv-text-muted" lang="de" dir="ltr">{current.lemma}{current.retry?" · "+t("practice.retryLabel"):""}</span>
        </div>

        <h1 className="learning-prompt learning-content m-0 text-uv-fb5d06bc327 uv-line-height-8e007eaa50 uv-letter-spacing-b22247dbaf uv-weight-560" dir="auto">{current.exercise.prompt}</h1>

        {current.exercise.interaction==="choice"?(
          <div className="practice-choice-grid grid uv-grid-template-columns-6a5c4d4d49 gap-2.5 uv-min620:uv-grid-template-columns-dd0b1a1848" role="group" aria-label={t("practice.answerChoices")}>
            {current.exercise.options?.map((option)=>{
              const isExpected=success&&option===current.exercise.expected;
              const isSelected=selected===option;
              const isWrong=success&&isSelected&&!result.correct;
              return <button
                key={option}
                type="button"
                className={[
                  "practice-option min-h-14.5 w-full flex items-center justify-between gap-3 uv-padding-b0f44c163d uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface text-uv-text text-left cursor-pointer uv-transition-792ccfb84f uv-v999cdc25ee:border-uv-border-strong uv-v999cdc25ee:bg-uv-surface-raised uv-v999cdc25ee:uv-transform-4693dc4baa uv-v8b31ac2bd7:border-uv-border-strong uv-v8b31ac2bd7:bg-uv-surface-raised uv-v8b31ac2bd7:uv-transform-4693dc4baa disabled:cursor-default uv-v48f8f87023:border-uv-border-strong uv-v48f8f87023:bg-uv-surface-raised uv-vc1297541ff:border-uv-success uv-vc1297541ff:bg-uv-cafddaf6a65 uv-vfbdf4ae9ba:border-uv-danger uv-vfbdf4ae9ba:bg-uv-c8b3083dabe uv-vefd2d335a6:text-uv-success uv-vd980f564fa:text-uv-danger",
                  isExpected?"is-correct":"",
                  isWrong?"is-wrong":"",
                  isSelected?"is-selected":"",
                ].filter(Boolean).join(" ")}
                disabled={success}
                onClick={()=>submit(option)}
              >
                <span className="learning-content" dir="auto">{option}</span>
                {isExpected?<CheckCircle2 size={18}/>:isWrong?<XCircle size={18}/>:null}
              </button>;
            })}
          </div>
        ):(
          <form onSubmit={(event)=>{ event.preventDefault();submit(answer); }}>
            <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
              <label htmlFor="practice-answer">{t("practice.yourAnswer")}</label>
              <input id="practice-answer" value={answer} onChange={(event)=>setAnswer(event.target.value)} disabled={success} autoFocus autoComplete="off" dir="auto"/>
            </div>
            <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" type="submit" disabled={success||!answer.trim()}>
              <Check size={18}/>{t("practice.checkAnswer")}
            </button>
          </form>
        )}

        {saveError?<StatusNotice tone="error">{saveError}</StatusNotice>:null}
        {result?.status==="error"?<StatusNotice tone="error">{result.message}</StatusNotice>:null}
        {result?.status==="success"?(
          <div className={"practice-instant-feedback min-h-10.5 flex items-center gap-2.25 uv-padding-df857c6c31 rounded-uv-r0939007802 text-uv-text-muted bg-uv-surface-raised uv-vc1297541ff:text-uv-success uv-vc1297541ff:bg-uv-cafddaf6a65 uv-vfbdf4ae9ba:text-uv-danger uv-vfbdf4ae9ba:bg-uv-c8b3083dabe uv-v22810335d8:flex uv-v22810335d8:flex-col uv-v22810335d8:gap-0.5 uv-v982220ddd5:text-uv-text-muted "+(result.correct?"is-correct":"is-wrong")} role="status">
            {result.correct?<CheckCircle2 size={18}/>:<XCircle size={18}/>}
            <span>
              <strong>{result.correct?t("practice.correct"):t("practice.notQuite")}</strong>
              {!result.correct?<small className="learning-content" dir="auto">{t("practice.correctAnswer",{ answer:result.expected })}</small>:<small>{t("practice.nextQuestion")}</small>}
            </span>
          </div>
        ):null}
      </motion.section>
    </AnimatePresence>
  </div>;
}
