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
    return <section className="panel practice-complete [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:16px] [border-radius:18px]">
      <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("practice.sessionComplete")}</p>
      <h1>{t("practice.correctCount",{ correct:formatNumber(locale,correct),total:formatNumber(locale,history.length) })}</h1>
      <p className="muted [color:var(--text-muted)]">{t("practice.practiced",{ skills:skills.join(", ")||t("practice.vocabulary").toLowerCase() })}</p>
      <div className="ia-empty-actions [display:flex] [flex-direction:column] [gap:8px] min-[620px]:[flex-direction:row] min-[620px]:[align-items:center]">
        <Link className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" href={exercises.some((item)=>item.grammarConceptId)?"/practice?grammar=1":"/practice?drill=1"}><RotateCcw size={17}/> {t("practice.anotherSet")}</Link>
        {exercises.some((item)=>item.grammarConceptId)?<Link className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" href="/grammar">{t("practice.backGrammar")}</Link>:<Link className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" href="/review">{t("practice.reviewDue")}</Link>}
        <Link className="text-link [color:var(--primary-strong)] [font-weight:560] [display:inline-flex] [align-items:center] [gap:6px]" href={exercises.some((item)=>item.grammarConceptId)?"/practice":"/vocabulary"}>{exercises.some((item)=>item.grammarConceptId)?t("practice.back"):t("practice.backWords")}</Link>
      </div>
    </section>;
  }

  const progress=Math.min(100,Math.round((index/Math.max(queue.length,1))*100));
  const success=result?.status==="success";

  return <div className="practice-session-stage [display:flex] [flex-direction:column] [gap:12px]">
    <div className="practice-progress [display:grid] [grid-template-columns:auto_minmax(0,1fr)] [align-items:center] [gap:10px] [color:var(--text-muted)] [font-size:.72rem]">
      <span>{formatNumber(locale,Math.min(index+1,queue.length))} / {formatNumber(locale,queue.length)}</span>
      <div className="metric-bar [height:7px] [overflow:hidden] [border-radius:999px] [background:var(--surface-soft)] [&_>_span]:[display:block] [&_>_span]:[height:100%] [&_>_span]:[border-radius:inherit] [&_>_span]:[background:var(--primary)]"><span style={{ width:progress+"%" }}/></div>
    </div>

    <AnimatePresence mode="wait" initial={false}>
      <motion.section
        key={current.id}
        className="panel learning-card practice-session-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [width:100%] [max-width:760px] [&_.learning-prompt]:[font-size:clamp(1.55rem,_7vw,_2.35rem)] [display:flex] [flex-direction:column] [gap:16px] [&_form]:[display:flex] [&_form]:[flex-direction:column] [&_form]:[gap:12px] [&_input]:[min-height:50px] [border-radius:18px]"
        initial={reduceMotion?false:{ opacity:0,x:28,scale:.99 }}
        animate={{ opacity:1,x:0,scale:1 }}
        exit={reduceMotion?{ opacity:0 }:{ opacity:0,x:-34,scale:.985 }}
        transition={{ duration:reduceMotion?0:.2,ease:"easeOut" }}
      >
        <div className="learning-card-head [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_>_.muted]:[font-size:0.78rem]">
          <span className="exercise-type [color:var(--text-muted)] [font-size:0.74rem] [text-transform:capitalize]">{current.exercise.type.replaceAll("_"," ").toLowerCase()}</span>
          <span className="muted learning-content [color:var(--text-muted)]" lang="de" dir="ltr">{current.lemma}{current.retry?" · "+t("practice.retryLabel"):""}</span>
        </div>

        <h1 className="learning-prompt learning-content [margin:0] [font-size:clamp(1.35rem,_6vw,_2rem)] [line-height:1.25] [letter-spacing:-0.035em] [font-weight:560]" dir="auto">{current.exercise.prompt}</h1>

        {current.exercise.interaction==="choice"?(
          <div className="practice-choice-grid [display:grid] [grid-template-columns:1fr] [gap:10px] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]" role="group" aria-label={t("practice.answerChoices")}>
            {current.exercise.options?.map((option)=>{
              const isExpected=success&&option===current.exercise.expected;
              const isSelected=selected===option;
              const isWrong=success&&isSelected&&!result.correct;
              return <button
                key={option}
                type="button"
                className={[
                  "practice-option [min-height:58px] [width:100%] [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding:13px_15px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface)] [color:var(--text)] [text-align:left] [cursor:pointer] [transition:transform_140ms_ease,_border-color_140ms_ease,_background_140ms_ease,_opacity_140ms_ease] [&:hover:not(:disabled)]:[border-color:var(--border-strong)] [&:hover:not(:disabled)]:[background:var(--surface-raised)] [&:hover:not(:disabled)]:[transform:translateY(-1px)] [&:focus-visible:not(:disabled)]:[border-color:var(--border-strong)] [&:focus-visible:not(:disabled)]:[background:var(--surface-raised)] [&:focus-visible:not(:disabled)]:[transform:translateY(-1px)] [&:disabled]:[cursor:default] [&.is-selected]:[border-color:var(--border-strong)] [&.is-selected]:[background:var(--surface-raised)] [&.is-correct]:[border-color:var(--success)] [&.is-correct]:[background:var(--success-soft)] [&.is-wrong]:[border-color:var(--danger)] [&.is-wrong]:[background:var(--danger-soft)] [&.is-correct_>_svg]:[color:var(--success)] [&.is-wrong_>_svg]:[color:var(--danger)]",
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
            <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
              <label htmlFor="practice-answer">{t("practice.yourAnswer")}</label>
              <input id="practice-answer" value={answer} onChange={(event)=>setAnswer(event.target.value)} disabled={success} autoFocus autoComplete="off" dir="auto"/>
            </div>
            <button className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" type="submit" disabled={success||!answer.trim()}>
              <Check size={18}/>{t("practice.checkAnswer")}
            </button>
          </form>
        )}

        {saveError?<StatusNotice tone="error">{saveError}</StatusNotice>:null}
        {result?.status==="error"?<StatusNotice tone="error">{result.message}</StatusNotice>:null}
        {result?.status==="success"?(
          <div className={"practice-instant-feedback [min-height:42px] [display:flex] [align-items:center] [gap:9px] [padding:10px_12px] [border-radius:12px] [color:var(--text-muted)] [background:var(--surface-raised)] [&.is-correct]:[color:var(--success)] [&.is-correct]:[background:var(--success-soft)] [&.is-wrong]:[color:var(--danger)] [&.is-wrong]:[background:var(--danger-soft)] [&_>_span]:[display:flex] [&_>_span]:[flex-direction:column] [&_>_span]:[gap:2px] [&_small]:[color:var(--text-muted)] "+(result.correct?"is-correct":"is-wrong")} role="status">
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
