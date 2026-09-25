"use client";

import { useRef, useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import type { ExerciseDefinition } from "@/lib/exercises/types";
import { ActionButton } from "@/components/action-button";
import { submitReview } from "./actions";

type Props = {
  userVocabularyId: string;
  lemma: string;
  article: string | null;
  patterns: string[];
  translations: { language: string; text: string }[];
  exercise: ExerciseDefinition;
};

export function ReviewCard(props: Props) {
  const [revealed, setRevealed] = useState(false);
  const startedAt = useRef(Date.now());

  return (
    <section className="panel learning-card">
      <div className="learning-card-head">
        <span className="badge">{props.exercise.type.replaceAll("_", " ")}</span>
        <span className="muted">{props.lemma}</span>
      </div>

      <h2 className="learning-prompt">{props.exercise.prompt}</h2>

      {!revealed ? (
        <>
          {props.exercise.hint && (
            <details>
              <summary>Show hint</summary>
              <p className="muted">{props.exercise.hint}</p>
            </details>
          )}
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
            {props.exercise.expected ? (
              <p><b>Expected:</b> {props.exercise.expected}</p>
            ) : null}
            <p className="word">
              {props.article ? props.article + " " : ""}{props.lemma}
            </p>
            {props.translations.map((translation) => (
              <p
                key={translation.language + ":" + translation.text}
                className={translation.language === "fa" ? "rtl" : undefined}
              >
                {translation.text}
              </p>
            ))}
            {props.patterns.map((pattern) => (
              <p key={pattern}><b>{pattern}</b></p>
            ))}
          </div>

          <div className="learning-card-head">
            <p className="muted">How difficult was this retrieval?</p>
            <button
              className="text-button"
              type="button"
              onClick={() => setRevealed(false)}
            >
              <RotateCcw size={15} />
              Hide
            </button>
          </div>

          <div className="grade-grid">
            {(["AGAIN", "HARD", "GOOD", "EASY"] as const).map((grade) => (
              <form action={submitReview} key={grade}>
                <input type="hidden" name="userVocabularyId" value={props.userVocabularyId} />
                <input type="hidden" name="grade" value={grade} />
                <input type="hidden" name="exerciseType" value={props.exercise.type} />
                <input type="hidden" name="prompt" value={props.exercise.prompt} />
                <input type="hidden" name="startedAt" value={startedAt.current} />
                <ActionButton
                  variant={grade === "AGAIN" ? "danger" : grade === "EASY" ? "success" : "secondary"}
                  pendingLabel="Saving review…"
                >
                  {grade.charAt(0) + grade.slice(1).toLowerCase()}
                </ActionButton>
              </form>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
