"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, RotateCcw } from "lucide-react";
import type { ReviewGrade } from "@/lib/fsrs";
import type { ReviewQueueCard } from "@/lib/review-queue";

const ratings:Array<{ grade:ReviewGrade;label:string;hint:string }>=[
  { grade:"AGAIN",label:"Again",hint:"Could not recall · FSRS will schedule it sooner" },
  { grade:"HARD",label:"Hard",hint:"Recalled with effort · shorter interval" },
  { grade:"GOOD",label:"Good",hint:"Recalled correctly · normal interval" },
  { grade:"EASY",label:"Easy",hint:"Immediate recall · longest interval" },
];

export function ReviewCard({
  card,onGrade,
}:{
  card:ReviewQueueCard;
  onGrade:(grade:ReviewGrade,startedAt:number)=>void;
}){
  const [revealed,setRevealed]=useState(false);
  const startedAt=useRef(Date.now());
  const reduceMotion = useReducedMotion();

  useEffect(()=>{
    function keydown(event:KeyboardEvent){
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
  },[onGrade,revealed]);

  return <section className="panel learning-card review-flashcard">
    <div className="learning-card-head">
      <span className="badge">{card.review.family.replaceAll("_"," ").toLowerCase()}</span>
      <span className="muted">active recall</span>
    </div>

    <motion.div
      animate={{ rotateY: revealed ? 180 : 0 }}
      className="review-card-flip"
      style={{ transformStyle: "preserve-3d" }}
      transition={{ duration: reduceMotion ? 0 : 0.42, ease: "easeInOut" }}
    >
      <div aria-hidden={revealed} className="review-card-face review-card-front">
        <p className="eyebrow">RECALL</p>
        <h2 className="learning-prompt">{card.review.front.prompt}</h2>
        {card.review.front.hint?<p className="muted">{card.review.front.hint}</p>:null}
      </div>
      <div aria-hidden={!revealed} className="answer-panel review-card-face review-card-back">
        <p className="eyebrow">CHECK</p>
        <strong>{card.review.back.answer}</strong>
        {card.review.back.details.map((detail)=><p key={detail}>{detail}</p>)}
      </div>
    </motion.div>

    {!revealed?<button className="button button-primary review-reveal" type="button" onClick={()=>setRevealed(true)}>
      <Eye size={18}/>Reveal answer
    </button>:<>
      <div className="learning-card-head">
        <p className="muted">Rate retrieval difficulty. FSRS uses this to schedule the next review. Keys 1–4 also work.</p>
        <button className="text-button" type="button" onClick={()=>setRevealed(false)}>
          <RotateCcw size={15}/>Hide
        </button>
      </div>
      <div className="grade-grid review-grade-grid">
        {ratings.map((rating,index)=><button
          className={"button "+(rating.grade==="AGAIN"?"button-danger":rating.grade==="EASY"?"button-success":"button-secondary")}
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
