"use client";

import { useState } from "react";
import { submitReview } from "./actions";

type Props = {
  userVocabularyId: string;
  lemma: string;
  article: string | null;
  patterns: string[];
  translations: { language: string; text: string }[];
};

export function ReviewCard(props: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="card" style={{ maxWidth: 720 }}>
      <p className="muted">ACTIVE RECALL</p>
      <h2 style={{ fontSize: "2.5rem" }}>
        {props.article ? `${props.article} ` : ""}{props.lemma}
      </h2>
      <p>Before revealing the answer, recall its meaning, pattern, and a natural sentence.</p>

      {!revealed ? (
        <button className="button" type="button" onClick={() => setRevealed(true)}>
          Reveal
        </button>
      ) : (
        <>
          <div className="answerPanel">
            {props.translations.map((translation) => (
              <p
                key={`${translation.language}:${translation.text}`}
                className={translation.language === "fa" ? "rtl" : undefined}
              >
                {translation.text}
              </p>
            ))}
            {props.patterns.map((pattern) => <p key={pattern}><b>{pattern}</b></p>)}
          </div>
          <p className="muted">How difficult was the recall?</p>
          <div className="toolbar">
            {(["AGAIN", "HARD", "GOOD", "EASY"] as const).map((grade) => (
              <form action={submitReview} key={grade}>
                <input type="hidden" name="userVocabularyId" value={props.userVocabularyId} />
                <input type="hidden" name="grade" value={grade} />
                <button className="button secondary" type="submit">{grade}</button>
              </form>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
