"use client";

import { useRef, useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import type { ReviewGrade } from "@/lib/fsrs";
import type { ReviewQueueCard } from "@/lib/review-queue";

export function ReviewCard({
  card,
  onGrade,
  isSubmitting,
}: {
  card: ReviewQueueCard;
  onGrade: (grade: ReviewGrade, startedAt: number) => void;
  isSubmitting: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const startedAt = useRef(Date.now());

  return (
    <section className="panel learning-card">
      <div className="learning-card-head">
        <span className="badge">
          {card.exercise.type.replaceAll("_", " ")}
        </span>
        <span className="muted">{card.lemma}</span>
      </div>

      <h2 className="learning-prompt">{card.exercise.prompt}</h2>

      {!revealed ? (
        <>
          {card.exercise.hint ? (
            <details>
              <summary>Show hint</summary>
              <p className="muted">{card.exercise.hint}</p>
            </details>
          ) : null}
          <button
            className="button button-primary"
            type="button"
            onClick={() => setRevealed(true)}
          >
            <Eye size={18} />
            Reveal answer
          </button>
        </>
      ) : (
        <>
          <div className="answer-panel">
            {card.exercise.expected ? (
              <p><b>Expected:</b> {card.exercise.expected}</p>
            ) : null}
            <p className="word">
              {card.article ? card.article + " " : ""}
              {card.lemma}
            </p>
            {card.translations.map((translation) => (
              <p
                key={translation.language + ":" + translation.text}
                className={translation.language === "fa" ? "rtl" : undefined}
              >
                {translation.text}
              </p>
            ))}
            {card.patterns.map((pattern) => (
              <p key={pattern}><b>{pattern}</b></p>
            ))}
          </div>

          <div className="learning-card-head">
            <p className="muted">How difficult was this retrieval?</p>
            <button
              className="text-button"
              type="button"
              onClick={() => setRevealed(false)}
              disabled={isSubmitting}
            >
              <RotateCcw size={15} />
              Hide
            </button>
          </div>

          <div className="grade-grid" aria-busy={isSubmitting}>
            {(["AGAIN", "HARD", "GOOD", "EASY"] as const).map((grade) => (
              <button
                className={
                  "button " +
                  (grade === "AGAIN"
                    ? "button-danger"
                    : grade === "EASY"
                      ? "button-success"
                      : "button-secondary")
                }
                disabled={isSubmitting}
                key={grade}
                onClick={() => onGrade(grade, startedAt.current)}
                type="button"
              >
                {grade.charAt(0) + grade.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
