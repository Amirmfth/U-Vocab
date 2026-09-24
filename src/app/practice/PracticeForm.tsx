"use client";

import { useActionState } from "react";
import type { ExerciseDefinition } from "@/lib/exercises/types";
import { evaluatePractice, type PracticeState } from "./actions";

const initialState: PracticeState = { status: "idle" };

export function PracticeForm(props: {
  userVocabularyId: string;
  lemma: string;
  exercise: ExerciseDefinition;
}) {
  const [state, action, pending] = useActionState(evaluatePractice, initialState);

  return (
    <section className="card" style={{ maxWidth: 760 }}>
      <p className="muted">{props.exercise.type.replaceAll("_", " ")}</p>
      <h2>{props.exercise.prompt}</h2>

      {props.exercise.hint && (
        <details>
          <summary>Show hint</summary>
          <p className="muted">{props.exercise.hint}</p>
        </details>
      )}

      <form action={action}>
        <input type="hidden" name="userVocabularyId" value={props.userVocabularyId} />
        <input type="hidden" name="exerciseType" value={props.exercise.type} />
        <input type="hidden" name="prompt" value={props.exercise.prompt} />
        <input type="hidden" name="expected" value={props.exercise.expected ?? ""} />
        <input type="hidden" name="requiresAI" value={String(props.exercise.requiresAI)} />

        <label htmlFor="answer">Your answer</label>
        <textarea
          id="answer"
          name="answer"
          rows={props.exercise.type === "FREE_SENTENCE" || props.exercise.type === "PARAPHRASE" ? 5 : 3}
          required
        />

        <button className="button" type="submit" disabled={pending}>
          {pending ? "Checking…" : props.exercise.requiresAI ? "Evaluate with AI" : "Check answer"}
        </button>
      </form>

      {state.status !== "idle" && (
        <div className="answerPanel">
          <p>
            <b>
              {state.status === "error"
                ? "Error"
                : `Score: ${Math.round((state.score ?? 0) * 100)}%`}
            </b>
          </p>
          <p>{state.feedback}</p>
          {state.retryPrompt && <p><b>Retry:</b> {state.retryPrompt}</p>}
          {state.improvedSentence && (
            <p><b>Improved:</b> {state.improvedSentence}</p>
          )}
        </div>
      )}
    </section>
  );
}
