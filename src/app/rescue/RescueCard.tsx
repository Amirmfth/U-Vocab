"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, RotateCcw } from "lucide-react";
import type { ExerciseDefinition } from "@/lib/exercises/types";
import { ActionButton } from "@/components/action-button";
import { submitRescueReview } from "./actions";
import { formatLexemeLabel } from "@/lib/lexeme-display";

const ratings = [
  { grade: "AGAIN", label: "Again", hint: "Could not recall" },
  { grade: "HARD", label: "Hard", hint: "Recalled with effort" },
  { grade: "GOOD", label: "Good", hint: "Recalled correctly" },
  { grade: "EASY", label: "Easy", hint: "Immediate recall" },
] as const;

export function RescueCard(props: {
  userVocabularyId: string;
  ids: string;
  step: number;
  lemma: string;
  article: string | null;
  translations: Array<{ language: string; text: string }>;
  exercise: ExerciseDefinition;
  riskPercent: number;
  reasons: string[];
}) {
  const [revealed, setRevealed] = useState(false);
  const startedAt = useRef(Date.now());
  const gradeForms = useRef<Array<HTMLFormElement | null>>([]);
  const reduceMotion = useReducedMotion();
  const label = formatLexemeLabel(props);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        gradeForms.current[Number(event.key) - 1]?.requestSubmit();
      }
    }

    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [revealed]);

  return (
    <section className="panel learning-card review-flashcard rescue-card">
      <div className="learning-card-head">
        <span className="badge">rescue review</span>
        <span className="muted">{props.riskPercent}% risk score</span>
      </div>

      <motion.div
        animate={{ rotateY: revealed ? 180 : 0 }}
        className="review-card-flip"
        style={{ transformStyle: "preserve-3d" }}
        transition={{ duration: reduceMotion ? 0 : 0.42, ease: "easeInOut" }}
      >
        <div aria-hidden={revealed} className="review-card-face review-card-front">
          <p className="eyebrow">RESCUE RECALL</p>
          <h1 className="learning-prompt">{props.exercise.prompt}</h1>
          <div className="rescue-reasons" aria-label="Why this word needs rescue">
            {props.reasons.map((reason) => <span key={reason}>{reason}</span>)}
          </div>
        </div>

        <div aria-hidden={!revealed} className="answer-panel review-card-face review-card-back">
          <p className="eyebrow">CHECK</p>
          <strong>{props.exercise.expected || label}</strong>
          {props.exercise.expected && props.exercise.expected !== label ? <p className="word">{label}</p> : null}
          {props.translations.map((translation) => (
            <p
              key={translation.language + translation.text}
              className={translation.language === "fa" ? "rtl" : undefined}
            >
              {translation.text}
            </p>
          ))}
        </div>
      </motion.div>

      {!revealed ? (
        <button
          className="button button-primary review-reveal"
          type="button"
          onClick={() => setRevealed(true)}
        >
          <Eye size={18} />
          Reveal answer
        </button>
      ) : (
        <>
          <div className="learning-card-head">
            <p className="muted">Rate retrieval difficulty. Keys 1–4 also work.</p>
            <button className="text-button" type="button" onClick={() => setRevealed(false)}>
              <RotateCcw size={15} />
              Hide
            </button>
          </div>

          <div className="grade-grid review-grade-grid">
            {ratings.map((rating, index) => (
              <form
                action={submitRescueReview}
                key={rating.grade}
                ref={(element) => { gradeForms.current[index] = element; }}
              >
                <input type="hidden" name="userVocabularyId" value={props.userVocabularyId} />
                <input type="hidden" name="grade" value={rating.grade} />
                <input type="hidden" name="exerciseType" value={props.exercise.type} />
                <input type="hidden" name="prompt" value={props.exercise.prompt} />
                <input type="hidden" name="ids" value={props.ids} />
                <input type="hidden" name="step" value={props.step} />
                <input type="hidden" name="startedAt" value={startedAt.current} />
                <ActionButton
                  variant={
                    rating.grade === "AGAIN"
                      ? "danger"
                      : rating.grade === "EASY"
                        ? "success"
                        : "secondary"
                  }
                  pendingLabel="Saving…"
                >
                  <span>{rating.label}</span>
                  <small>{index + 1}</small>
                </ActionButton>
              </form>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
