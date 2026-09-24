"use client";

import { useActionState } from "react";
import { evaluatePractice, type PracticeState } from "./actions";

const initialState: PracticeState = { status: "idle" };

export function PracticeForm(props: {
  userVocabularyId: string;
  lemma: string;
  patterns: string[];
}) {
  const [state, action, pending] = useActionState(evaluatePractice, initialState);

  return (
    <section className="card" style={{ maxWidth: 760 }}>
      <p className="muted">ACTIVE PRODUCTION</p>
      <h2>Use “{props.lemma}” naturally</h2>
      {props.patterns.length > 0 && (
        <p className="muted">Useful pattern: {props.patterns[0]}</p>
      )}
      <form action={action}>
        <input type="hidden" name="userVocabularyId" value={props.userVocabularyId} />
        <label htmlFor="answer">Your German sentence</label>
        <textarea id="answer" name="answer" rows={5} required />
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Evaluating…" : "Evaluate with AI"}
        </button>
      </form>
      {state.status !== "idle" && (
        <div className="answerPanel">
          <p><b>{state.status === "error" ? "Error" : `Score: ${Math.round((state.score ?? 0) * 100)}%`}</b></p>
          <p>{state.feedback}</p>
          {state.improvedSentence && <p><b>Improved:</b> {state.improvedSentence}</p>}
        </div>
      )}
    </section>
  );
}
