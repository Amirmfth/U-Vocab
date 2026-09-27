"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  submitReadingAnswers,
  type ReadingAnswerState,
} from "../actions";

const initialState: ReadingAnswerState = { status: "idle" };

type Question = {
  type: "COMPREHENSION" | "VOCABULARY" | "GRAMMAR";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  grammarConceptId: string | null;
};

export function ReadingAssessment({
  readingId,
  questions,
}: {
  readingId: string;
  questions: Question[];
}) {
  const [state, action] = useActionState(submitReadingAnswers, initialState);

  return (
    <form action={action} className="panel reading-assessment">
      <input type="hidden" name="readingId" value={readingId} />
      <div className="section-heading">
        <div>
          <p className="eyebrow">COMPREHENSION</p>
          <h2>Check what you understood</h2>
        </div>
      </div>

      <div className="reading-question-list">
        {questions.map((question, index) => (
          <fieldset className="reading-question" key={index}>
            <legend>
              <span className="badge">{question.type.toLowerCase()}</span>
              {question.question}
            </legend>
            <div className="reading-question-options">
              {question.options.map((option, optionIndex) => (
                <label key={optionIndex}>
                  <input
                    type="radio"
                    name={"answer-" + index}
                    value={optionIndex}
                    required
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {state.status === "success" ? (
              <p className={state.correct?.[index] ? "reading-answer-correct" : "reading-answer-wrong"}>
                {state.correct?.[index] ? "Correct. " : "Not quite. "}
                {question.explanation}
              </p>
            ) : null}
          </fieldset>
        ))}
      </div>

      {state.status === "success" ? (
        <StatusNotice tone="success">
          <CheckCircle2 size={16} />
          {Math.round((state.score ?? 0) * 100)}% comprehension
        </StatusNotice>
      ) : null}
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Checking…">Check answers</ActionButton>
    </form>
  );
}
