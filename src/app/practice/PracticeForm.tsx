"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import type { ExerciseDefinition } from "@/lib/exercises/types";
import { StatusNotice } from "@/components/status-notice";
import { submitPracticeAnswer, type PracticeAnswerResult } from "./actions";

export type PracticeSessionExercise={
  id:string;
  userVocabularyId:string;
  lemma:string;
  retry?:boolean;
  exercise:ExerciseDefinition;
};

export function PracticeForm({ exercises }:{ exercises:PracticeSessionExercise[] }){
  const [queue,setQueue]=useState(exercises);
  const [index,setIndex]=useState(0);
  const [answer,setAnswer]=useState("");
  const [result,setResult]=useState<PracticeAnswerResult|null>(null);
  const [history,setHistory]=useState<Array<{ correct:boolean;skill:string }>>([]);
  const [pending,startTransition]=useTransition();
  const startedAt=useRef(Date.now());
  const current=queue[index];

  function submit(value:string){
    if(!current||pending||result?.status==="success") return;
    startTransition(async()=>{
      let response:PracticeAnswerResult;
      try {
        response=await submitPracticeAnswer({
          userVocabularyId:current.userVocabularyId,
          exerciseType:current.exercise.type,
          answer:value,
          startedAt:startedAt.current,
        });
      } catch (error) {
        if(error instanceof Error&&error.message.includes("Unauthorized")){
          window.location.assign("/login?returnTo="+encodeURIComponent(window.location.pathname+window.location.search));
          return;
        }
        response={ status:"error",message:"Could not save this practice attempt." };
      }
      setResult(response);
      if(response.status==="success"){
        setHistory((items)=>[...items,{ correct:response.correct,skill:current.exercise.skill }]);
        if(!response.correct&&!current.retry){
          setQueue((items)=>[...items,{ ...current,id:current.id+"-retry",retry:true }]);
        }
      }
    });
  }

  function next(){
    setIndex((value)=>value+1);
    setAnswer("");
    setResult(null);
    startedAt.current=Date.now();
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

  return <section className="panel learning-card practice-session-card">
    <div className="practice-progress">
      <span>{Math.min(index+1,queue.length)} / {queue.length}</span>
      <div className="metric-bar"><span style={{ width:progress+"%" }}/></div>
    </div>
    <div className="learning-card-head">
      <span className="exercise-type">{current.exercise.type.replaceAll("_"," ").toLowerCase()}</span>
      <span className="muted">{current.lemma}{current.retry?" · retry":""}</span>
    </div>
    <h1 className="learning-prompt">{current.exercise.prompt}</h1>
    {current.exercise.hint?<details><summary>Hint</summary><p className="muted">{current.exercise.hint}</p></details>:null}

    {current.exercise.interaction==="choice"?<div className="practice-choice-grid">
      {current.exercise.options?.map((option)=><button
        key={option}
        type="button"
        className="battle-option"
        disabled={pending||success}
        onClick={()=>{ setAnswer(option);submit(option); }}
      >{option}</button>)}
    </div>:<form onSubmit={(event)=>{ event.preventDefault();submit(answer); }}>
      <div className="field">
        <label htmlFor="practice-answer">Your answer</label>
        <input id="practice-answer" value={answer} onChange={(event)=>setAnswer(event.target.value)} disabled={pending||success} autoFocus autoComplete="off"/>
      </div>
      <button className="button button-primary" type="submit" disabled={pending||success||!answer.trim()}>
        <Check size={18}/>{pending?"Checking…":"Check answer"}
      </button>
    </form>}

    {result?.status==="error"?<StatusNotice tone="error">{result.message}</StatusNotice>:null}
    {result?.status==="success"?<div className="practice-feedback">
      <StatusNotice tone={result.correct?"success":"info"}>
        <strong>{result.correct?"Correct":"Not quite"}</strong><br/>{result.feedback}
      </StatusNotice>
      {!result.correct?<div className="answer-panel"><b>Expected:</b> {result.expected}</div>:null}
      <button className="button button-primary" type="button" onClick={next}>
        {index+1>=queue.length?"Finish":"Next"}<ArrowRight size={17}/>
      </button>
    </div>:null}
  </section>;
}
