"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { useI18n } from "@/i18n/client";
import { formatNumber, formatPercent } from "@/i18n/format";
import type { MessageKey } from "@/i18n/core";
import {
  submitReadingAnswers,
  type ReadingAnswerState,
} from "../actions";

const initialState: ReadingAnswerState = { status: "idle" };

const typeKeys: Record<string, MessageKey> = {
  COMPREHENSION: "reading.assessment.type.comprehension",
  VOCABULARY: "reading.assessment.type.vocabulary",
  GRAMMAR: "reading.assessment.type.grammar",
};

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
  const { locale, t } = useI18n();

  return (
    <form action={action} className="panel reading-assessment">
      <input type="hidden" name="readingId" value={readingId} />
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("reading.assessment.eyebrow")}</p>
          <h2>{t("reading.assessment.title")}</h2>
        </div>
      </div>

      <div className="reading-question-list">
        {questions.map((question, index) => (
          <fieldset className="reading-question" key={index}>
            <legend>
              <span className="reading-question-number">{formatNumber(locale, index + 1, { minimumIntegerDigits: 2, useGrouping: false })}</span>
              <span className="reading-question-heading">
                <span className="badge">{t(typeKeys[question.type])}</span>
                <strong className="learning-content" dir="auto">{question.question}</strong>
              </span>
            </legend>
            <div className="reading-question-options">
              {question.options.map((option, optionIndex) => (
                <label
                  className={
                    "reading-question-option" +
                    (state.status === "success" && optionIndex === question.correctIndex ? " is-correct" : "")
                  }
                  key={optionIndex}
                >
                  <input
                    type="radio"
                    name={"answer-" + index}
                    value={optionIndex}
                    required
                  />
                  <span className="reading-option-letter" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                  <span className="reading-option-text learning-content" dir="auto">{option}</span>
                </label>
              ))}
            </div>
            {state.status === "success" ? (
              <p className={state.correct?.[index] ? "reading-answer-feedback is-correct" : "reading-answer-feedback is-wrong"}>
                {state.correct?.[index] ? t("reading.assessment.correct") : t("reading.assessment.notQuite")}{" "}
                <span className="learning-content" dir="auto">{question.explanation}</span>
              </p>
            ) : null}
          </fieldset>
        ))}
      </div>

      {state.status === "success" ? (
        <StatusNotice tone="success">
          <CheckCircle2 size={16} />
          {t("reading.comprehension", { percent: formatPercent(locale, state.score ?? 0) })}
        </StatusNotice>
      ) : null}
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      <ActionButton pendingLabel={t("reading.assessment.checking")}>{t("reading.assessment.check")}</ActionButton>
    </form>
  );
}
