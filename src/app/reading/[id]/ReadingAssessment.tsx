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
    <form action={action} className="panel reading-assessment border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 max-w-uv-a9051779da mx-auto rounded-uv-r6d27d54c6c grid gap-5.5">
      <input type="hidden" name="readingId" value={readingId} />
      <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("reading.assessment.eyebrow")}</p>
          <h2>{t("reading.assessment.title")}</h2>
        </div>
      </div>

      <div className="reading-question-list grid gap-5.5">
        {questions.map((question, index) => (
          <fieldset className="reading-question grid border-0 border-1px-solid-border-3 in-legend:flex-wrap in-legend:font-650 min-w-0 gap-3.75 padding-19px-0-0 in-legend:w-full in-legend:flex in-legend:items-start in-legend:gap-2.75 in-legend:p-0 in-has-reading-answer-feedback-is-wrong-reading-question-o:border-uv-danger in-has-reading-answer-feedback-is-wrong-reading-question-o:bg-uv-c8b3083dabe" key={index}>
            <legend>
              <span className="reading-question-number w-8.5 h-8.5 flex-0-0-34px grid place-items-center border-1px-solid-border-2 rounded-uv-r933cc73310 text-uv-text-muted font-font-geist-mono-geist-mono-monospace text-uv-ff1713651e0">{formatNumber(locale, index + 1, { minimumIntegerDigits: 2, useGrouping: false })}</span>
              <span className="reading-question-heading grid gap-2 min-w-0 in-badge:w-fit in-strong-2:text-uv-text in-strong-2:text-uv-fde89c2b680 in-strong-2:line-height-1p45">
                <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{t(typeKeys[question.type])}</span>
                <strong className="learning-content" dir="auto">{question.question}</strong>
              </span>
            </legend>
            <div className="reading-question-options grid in-label:flex in-label:gap-2.5 in-label:items-start in-label:padding-10px-12px in-label:border-1px-solid-border-2 in-label:rounded-uv-r0939007802 in-label:cursor-pointer uv-max720:in-label:p-2.75 gap-2.25">
              {question.options.map((option, optionIndex) => (
                <label
                  className={
                    "reading-question-option min-h-13 flex items-center gap-3 padding-10px-13px border-1px-solid-border-2 rounded-uv-r0939007802 bg-uv-surface-raised cursor-pointer transition-border-color-140ms-ease-background-140ms-ease hover:border-uv-border-strong in-has-input-checked:border-uv-primary in-has-input-checked:bg-uv-cbdfd7cd038 in-is-correct:border-uv-success in-is-correct:bg-uv-cafddaf6a65 in-is-correct-reading-option-letter:border-uv-success in-is-correct-reading-option-letter:text-uv-success in-has-input-focus-visible:outline-2px-solid-primary-strong in-has-input-focus-visible:outline-offset-2px in-input:absolute in-input:opacity-0 in-input:w-0.25 in-input:h-0.25 in-has-input-checked-reading-option-letter:border-uv-primary in-has-input-checked-reading-option-letter:text-uv-primary-strong" +
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
                  <span className="reading-option-letter w-6.75 h-6.75 flex-0-0-27px grid place-items-center border-1px-solid-border-strong rounded-uv-r9bc5fefa1a text-uv-text-muted font-font-geist-mono-geist-mono-monospace text-uv-f58b84cc6f5" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                  <span className="reading-option-text learning-content text-uv-text-soft line-height-1p45" dir="auto">{option}</span>
                </label>
              ))}
            </div>
            {state.status === "success" ? (
              <p className={state.correct?.[index] ? "reading-answer-feedback is-correct m-0 padding-11px-13px rounded-uv-r933cc73310 text-uv-f845cf53f3a line-height-1p5 in-is-correct:bg-uv-cafddaf6a65 in-is-correct:text-uv-success in-is-wrong:bg-uv-c8b3083dabe in-is-wrong:text-uv-danger" : "reading-answer-feedback is-wrong m-0 padding-11px-13px rounded-uv-r933cc73310 text-uv-f845cf53f3a line-height-1p5 in-is-correct:bg-uv-cafddaf6a65 in-is-correct:text-uv-success in-is-wrong:bg-uv-c8b3083dabe in-is-wrong:text-uv-danger"}>
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
