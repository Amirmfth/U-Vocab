"use client";

import { useRef, useState } from "react";
import { Eye } from "lucide-react";
import type { ExerciseDefinition } from "@/lib/exercises/types";
import { ActionButton } from "@/components/action-button";
import { submitRescueReview } from "./actions";
import { formatLexemeLabel } from "@/lib/lexeme-display";

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

  return (
    <section className="panel learning-card rescue-card">
      <div className="learning-card-head">
        <span className="exercise-type">
          {props.exercise.type.replaceAll("_", " ").toLowerCase()}
        </span>
        <span className="rescue-risk">{props.riskPercent}% risk score</span>
      </div>

      <h1 className="learning-prompt">{props.exercise.prompt}</h1>

      <div className="rescue-reasons">
        {props.reasons.map((reason) => (
          <span key={reason}>{reason}</span>
        ))}
      </div>

      {!revealed ? (
        <button
          className="button button-primary"
          type="button"
          onClick={() => setRevealed(true)}
        >
          <Eye size={18} />
          Reveal
        </button>
      ) : (
        <>
          <div className="answer-panel">
            {props.exercise.expected ? (
              <p><b>Expected:</b> {props.exercise.expected}</p>
            ) : null}
            <p className="word">
              {formatLexemeLabel(props)}
            </p>
            {props.translations.map((translation) => (
              <p
                key={translation.language + translation.text}
                className={translation.language === "fa" ? "rtl" : undefined}
              >
                {translation.text}
              </p>
            ))}
          </div>

          <div className="grade-grid">
            {(["AGAIN", "HARD", "GOOD", "EASY"] as const).map((grade) => (
              <form action={submitRescueReview} key={grade}>
                <input type="hidden" name="userVocabularyId" value={props.userVocabularyId} />
                <input type="hidden" name="grade" value={grade} />
                <input type="hidden" name="exerciseType" value={props.exercise.type} />
                <input type="hidden" name="prompt" value={props.exercise.prompt} />
                <input type="hidden" name="ids" value={props.ids} />
                <input type="hidden" name="step" value={props.step} />
                <input type="hidden" name="startedAt" value={startedAt.current} />
                <ActionButton
                  variant={
                    grade === "AGAIN"
                      ? "danger"
                      : grade === "EASY"
                        ? "success"
                        : "secondary"
                  }
                  pendingLabel="Saving…"
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
