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
    <form action={action} className="panel reading-assessment [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [max-width:860px] [margin-inline:auto] [border-radius:18px] [display:grid] [gap:22px]">
      <input type="hidden" name="readingId" value={readingId} />
      <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
        <div>
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("reading.assessment.eyebrow")}</p>
          <h2>{t("reading.assessment.title")}</h2>
        </div>
      </div>

      <div className="reading-question-list [display:grid] [gap:22px]">
        {questions.map((question, index) => (
          <fieldset className="reading-question [display:grid] [border:0] [border-top:1px_solid_var(--border)] [&_legend]:[flex-wrap:wrap] [&_legend]:[font-weight:650] [min-width:0] [gap:15px] [padding:19px_0_0] [&_legend]:[width:100%] [&_legend]:[display:flex] [&_legend]:[align-items:flex-start] [&_legend]:[gap:11px] [&_legend]:[padding:0] [&:has(.reading-answer-feedback.is-wrong)_.reading-question-option:has(input:checked):not(.is-correct)]:[border-color:var(--danger)] [&:has(.reading-answer-feedback.is-wrong)_.reading-question-option:has(input:checked):not(.is-correct)]:[background:var(--danger-soft)]" key={index}>
            <legend>
              <span className="reading-question-number [width:34px] [height:34px] [flex:0_0_34px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:10px] [color:var(--text-muted)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.72rem]">{formatNumber(locale, index + 1, { minimumIntegerDigits: 2, useGrouping: false })}</span>
              <span className="reading-question-heading [display:grid] [gap:8px] [min-width:0] [&_.badge]:[width:fit-content] [&_strong]:[color:var(--text)] [&_strong]:[font-size:0.98rem] [&_strong]:[line-height:1.45]">
                <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{t(typeKeys[question.type])}</span>
                <strong className="learning-content" dir="auto">{question.question}</strong>
              </span>
            </legend>
            <div className="reading-question-options [display:grid] [&_label]:[display:flex] [&_label]:[gap:10px] [&_label]:[align-items:flex-start] [&_label]:[padding:10px_12px] [&_label]:[border:1px_solid_var(--border)] [&_label]:[border-radius:12px] [&_label]:[cursor:pointer] max-[720px]:[&_label]:[padding:11px] [gap:9px]">
              {question.options.map((option, optionIndex) => (
                <label
                  className={
                    "reading-question-option [min-height:52px] [display:flex] [align-items:center] [gap:12px] [padding:10px_13px] [border:1px_solid_var(--border)] [border-radius:12px] [background:var(--surface-raised)] [cursor:pointer] [transition:border-color_140ms_ease,_background_140ms_ease] [&:hover]:[border-color:var(--border-strong)] [&:has(input:checked)]:[border-color:var(--primary)] [&:has(input:checked)]:[background:var(--primary-soft)] [&.is-correct]:[border-color:var(--success)] [&.is-correct]:[background:var(--success-soft)] [&.is-correct_.reading-option-letter]:[border-color:var(--success)] [&.is-correct_.reading-option-letter]:[color:var(--success)] [&:has(input:focus-visible)]:[outline:2px_solid_var(--primary-strong)] [&:has(input:focus-visible)]:[outline-offset:2px] [&_input]:[position:absolute] [&_input]:[opacity:0] [&_input]:[width:1px] [&_input]:[height:1px] [&:has(input:checked)_.reading-option-letter]:[border-color:var(--primary)] [&:has(input:checked)_.reading-option-letter]:[color:var(--primary-strong)]" +
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
                  <span className="reading-option-letter [width:27px] [height:27px] [flex:0_0_27px] [display:grid] [place-items:center] [border:1px_solid_var(--border-strong)] [border-radius:8px] [color:var(--text-muted)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.7rem]" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                  <span className="reading-option-text learning-content [color:var(--text-soft)] [line-height:1.45]" dir="auto">{option}</span>
                </label>
              ))}
            </div>
            {state.status === "success" ? (
              <p className={state.correct?.[index] ? "reading-answer-feedback is-correct [margin:0] [padding:11px_13px] [border-radius:10px] [font-size:0.83rem] [line-height:1.5] [&.is-correct]:[background:var(--success-soft)] [&.is-correct]:[color:var(--success)] [&.is-wrong]:[background:var(--danger-soft)] [&.is-wrong]:[color:var(--danger)]" : "reading-answer-feedback is-wrong [margin:0] [padding:11px_13px] [border-radius:10px] [font-size:0.83rem] [line-height:1.5] [&.is-correct]:[background:var(--success-soft)] [&.is-correct]:[color:var(--success)] [&.is-wrong]:[background:var(--danger-soft)] [&.is-wrong]:[color:var(--danger)]"}>
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
