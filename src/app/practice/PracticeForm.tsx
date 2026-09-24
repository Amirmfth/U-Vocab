"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import type { ExerciseDefinition } from "@/lib/exercises/types";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { evaluatePractice, type PracticeState } from "./actions";

const initialState: PracticeState = { status: "idle" };

export function PracticeForm(props: {
  userVocabularyId: string;
  lemma: string;
  exercise: ExerciseDefinition;
}) {
  const [state, action] = useActionState(evaluatePractice, initialState);

  return (
    <section className="panel learning-card">
      <div className="learning-card-head">
        <span className="badge">{props.exercise.type.replaceAll("_", " ")}</span>
        <span className="muted">{props.lemma}</span>
      </div>

      <h2 className="learning-prompt">{props.exercise.prompt}</h2>

      {props.exercise.hint ? (
        <details>
          <summary>Show hint</summary>
          <p className="muted">{props.exercise.hint}</p>
        </details>
      ) : null}

      <form action={action}>
        <input type="hidden" name="userVocabularyId" value={props.userVocabularyId} />
        <input type="hidden" name="exerciseType" value={props.exercise.type} />
        <input type="hidden" name="prompt" value={props.exercise.prompt} />
        <input type="hidden" name="expected" value={props.exercise.expected ?? ""} />
        <input type="hidden" name="requiresAI" value={String(props.exercise.requiresAI)} />

        <div className="field">
          <label htmlFor="answer">Your answer</label>
          <textarea
            id="answer"
            name="answer"
            rows={props.exercise.type === "FREE_SENTENCE" || props.exercise.type === "PARAPHRASE" ? 5 : 3}
            required
          />
        </div>

        <ActionButton
          pendingLabel={props.exercise.requiresAI ? "OpenAI is evaluating…" : "Checking answer…"}
        >
          <Sparkles size={18} />
          {props.exercise.requiresAI ? "Evaluate with AI" : "Check answer"}
        </ActionButton>
      </form>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.feedback ?? "The attempt failed."}</StatusNotice>
      ) : null}

      {state.status === "success" ? (
        <div className="feedback-stack">
          <StatusNotice tone={(state.score ?? 0) >= 0.7 ? "success" : "info"}>
            <b>Score: {Math.round((state.score ?? 0) * 100)}%</b>
            <br />
            {state.feedback}
          </StatusNotice>
          {state.retryPrompt ? (
            <div className="answer-panel"><b>Retry:</b> {state.retryPrompt}</div>
          ) : null}
          {state.improvedSentence ? (
            <div className="answer-panel"><b>Improved:</b> {state.improvedSentence}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
