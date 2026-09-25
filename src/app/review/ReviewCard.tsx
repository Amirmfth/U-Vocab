"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import type { ReviewGrade } from "@/lib/fsrs";
import type { ReviewQueueCard } from "@/lib/review-queue";

const ratings:Array<{ grade:ReviewGrade;label:string;hint:string }>=[
  { grade:"AGAIN",label:"Again",hint:"Could not recall" },
  { grade:"HARD",label:"Hard",hint:"Recalled with effort" },
  { grade:"GOOD",label:"Good",hint:"Recalled correctly" },
  { grade:"EASY",label:"Easy",hint:"Immediate recall" },
];

export function ReviewCard({
  card,onGrade,isSubmitting,
}:{
  card:ReviewQueueCard;
  onGrade:(grade:ReviewGrade,startedAt:number)=>void;
  isSubmitting:boolean;
}){
  const [revealed,setRevealed]=useState(false);
  const startedAt=useRef(Date.now());

  useEffect(()=>{
    function keydown(event:KeyboardEvent){
      if(isSubmitting) return;
      if(!revealed&&(event.key===" "||event.key==="Enter")){
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if(revealed&&["1","2","3","4"].includes(event.key)){
        event.preventDefault();
        onGrade(ratings[Number(event.key)-1].grade,startedAt.current);
      }
    }
    window.addEventListener("keydown",keydown);
    return ()=>window.removeEventListener("keydown",keydown);
  },[isSubmitting,onGrade,revealed]);

  return <section className="panel learning-card review-flashcard">
    <div className="learning-card-head">
      <span className="badge">{card.review.family.replaceAll("_"," ").toLowerCase()}</span>
      <span className="muted">active recall</span>
    </div>

    <div className="review-card-front">
      <p className="eyebrow">RECALL</p>
      <h2 className="learning-prompt">{card.review.front.prompt}</h2>
      {card.review.front.hint?<p className="muted">{card.review.front.hint}</p>:null}
    </div>

    {!revealed?<button className="button button-primary review-reveal" type="button" onClick={()=>setRevealed(true)}>
      <Eye size={18}/>Reveal answer
    </button>:<>
      <div className="answer-panel review-card-back">
        <p className="eyebrow">CHECK</p>
        <strong>{card.review.back.answer}</strong>
        {card.review.back.details.map((detail)=><p key={detail}>{detail}</p>)}
      </div>
      <div className="learning-card-head">
        <p className="muted">Rate retrieval difficulty. Keys 1–4 also work.</p>
        <button className="text-button" type="button" onClick={()=>setRevealed(false)} disabled={isSubmitting}>
          <RotateCcw size={15}/>Hide
        </button>
      </div>
      <div className="grade-grid review-grade-grid" aria-busy={isSubmitting}>
        {ratings.map((rating,index)=><button
          className={"button "+(rating.grade==="AGAIN"?"button-danger":rating.grade==="EASY"?"button-success":"button-secondary")}
          disabled={isSubmitting}
          key={rating.grade}
          onClick={()=>onGrade(rating.grade,startedAt.current)}
          type="button"
          title={rating.hint}
        >
          <span>{rating.label}</span><small>{index+1}</small>
        </button>)}
      </div>
    </>}
  </section>;
}
