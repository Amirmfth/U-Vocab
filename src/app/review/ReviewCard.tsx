"use client";

import { useState } from "react";
import type { ExerciseDefinition } from "@/lib/exercises/types";
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

  return (
    <section className="card" style={{ maxWidth: 720 }}>
      <p className="muted">{props.exercise.type.replaceAll("_", " ")}</p>
      <h2 style={{ fontSize: "2rem" }}>{props.exercise.prompt}</h2>

      {!revealed ? (
        <>
          {props.exercise.hint && (
            <details>
              <summary>Show hint</summary>
              <p className="muted">{props.exercise.hint}</p>
            </details>
          )}
          <button className="button" type="button" onClick={() => setRevealed(true)}>
            Reveal answer and self-grade
          </button>
        </>
      ) : (
        <>
          <div className="answerPanel">
            {props.exercise.expected && (
              <p><b>Expected:</b> {props.exercise.expected}</p>
            )}
            <p>
              <b>{props.article ? props.article + " " : ""}{props.lemma}</b>
            </p>
            {props.translations.map((translation) => (
              <p
                key={translation.language + ":" + translation.text}
                className={translation.language === "fa" ? "rtl" : undefined}
              >
                {translation.text}
              </p>
            ))}
            {props.patterns.map((pattern) => <p key={pattern}><b>{pattern}</b></p>)}
          </div>

          <p className="muted">How difficult was this retrieval?</p>
          <div className="toolbar">
            {(["AGAIN", "HARD", "GOOD", "EASY"] as const).map((grade) => (
              <form action={submitReview} key={grade}>
                <input type="hidden" name="userVocabularyId" value={props.userVocabularyId} />
                <input type="hidden" name="grade" value={grade} />
                <input type="hidden" name="exerciseType" value={props.exercise.type} />
                <input type="hidden" name="prompt" value={props.exercise.prompt} />
                <button className="button secondary" type="submit">{grade}</button>
              </form>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
