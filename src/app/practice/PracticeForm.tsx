"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import type { ExerciseDefinition } from "@/lib/exercises/types";
import { checkDeterministicAnswer } from "@/lib/exercises/check";
import { StatusNotice } from "@/components/status-notice";
import { submitPracticeAnswer, type PracticeAnswerResult } from "./actions";

export type PracticeSessionExercise={
  id:string;
  userVocabularyId:string;
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
        setSaveError("Your feedback was shown, but this attempt could not be saved.");
    });
  }

  if(!current){
    const correct=history.filter((item)=>item.correct).length;
    const skills=[...new Set(history.map((item)=>item.skill))];
    return <section className="panel practice-complete">
      <p className="eyebrow">SESSION COMPLETE</p>
      <h1>{correct} of {history.length} correct</h1>
      <p className="muted">Practiced {skills.join(", ")||"vocabulary"} with missed items reinforced once.</p>
      <div className="ia-empty-actions">
        <Link className="button button-primary" href="/practice?drill=1"><RotateCcw size={17}/> Practice another set</Link>
        <Link className="button button-secondary" href="/review">Review due cards</Link>
        <Link className="text-link" href="/vocabulary">Back to words</Link>
      </div>
    </section>;
  }

  const progress=Math.min(100,Math.round((index/Math.max(queue.length,1))*100));
  const success=result?.status==="success";

  return <div className="practice-session-stage">
    <div className="practice-progress">
      <span>{Math.min(index+1,queue.length)} / {queue.length}</span>
      <div className="metric-bar"><span style={{ width:progress+"%" }}/></div>
    </div>

    <AnimatePresence mode="wait" initial={false}>
      <motion.section
        key={current.id}
        className="panel learning-card practice-session-card"
        initial={reduceMotion?false:{ opacity:0,x:28,scale:.99 }}
        animate={{ opacity:1,x:0,scale:1 }}
        exit={reduceMotion?{ opacity:0 }:{ opacity:0,x:-34,scale:.985 }}
        transition={{ duration:reduceMotion?0:.2,ease:"easeOut" }}
      >
        <div className="learning-card-head">
          <span className="exercise-type">{current.exercise.type.replaceAll("_"," ").toLowerCase()}</span>
          <span className="muted">{current.lemma}{current.retry?" · retry":""}</span>
        </div>

        <h1 className="learning-prompt">{current.exercise.prompt}</h1>

        {current.exercise.interaction==="choice"?(
          <div className="practice-choice-grid" role="group" aria-label="Answer choices">
            {current.exercise.options?.map((option)=>{
              const isExpected=success&&option===current.exercise.expected;
              const isSelected=selected===option;
              const isWrong=success&&isSelected&&!result.correct;
              return <button
                key={option}
                type="button"
                className={[
                  "practice-option",
                  isExpected?"is-correct":"",
                  isWrong?"is-wrong":"",
                  isSelected?"is-selected":"",
                ].filter(Boolean).join(" ")}
                disabled={success}
                onClick={()=>submit(option)}
              >
                <span>{option}</span>
                {isExpected?<CheckCircle2 size={18}/>:isWrong?<XCircle size={18}/>:null}
              </button>;
            })}
          </div>
        ):(
          <form onSubmit={(event)=>{ event.preventDefault();submit(answer); }}>
            <div className="field">
              <label htmlFor="practice-answer">Your answer</label>
              <input id="practice-answer" value={answer} onChange={(event)=>setAnswer(event.target.value)} disabled={success} autoFocus autoComplete="off"/>
            </div>
            <button className="button button-primary" type="submit" disabled={success||!answer.trim()}>
              <Check size={18}/>Check answer
            </button>
          </form>
        )}

        {saveError?<StatusNotice tone="error">{saveError}</StatusNotice>:null}
        {result?.status==="error"?<StatusNotice tone="error">{result.message}</StatusNotice>:null}
        {result?.status==="success"?(
          <div className={"practice-instant-feedback "+(result.correct?"is-correct":"is-wrong")} role="status">
            {result.correct?<CheckCircle2 size={18}/>:<XCircle size={18}/>}
            <span>
              <strong>{result.correct?"Correct":"Not quite"}</strong>
              {!result.correct?<small>Correct answer: {result.expected}</small>:<small>Next question…</small>}
            </span>
          </div>
        ):null}
      </motion.section>
    </AnimatePresence>
  </div>;
}
