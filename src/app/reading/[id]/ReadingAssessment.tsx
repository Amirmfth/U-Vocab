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
    <form action={action} className="panel reading-assessment uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 max-w-uv-a9051779da mx-auto rounded-uv-r6d27d54c6c grid gap-5.5">
      <input type="hidden" name="readingId" value={readingId} />
      <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("reading.assessment.eyebrow")}</p>
          <h2>{t("reading.assessment.title")}</h2>
        </div>
      </div>

      <div className="reading-question-list grid gap-5.5">
        {questions.map((question, index) => (
          <fieldset className="reading-question grid border-0 uv-border-top-8d7f82f403 uv-v73883af7e9:flex-wrap uv-v73883af7e9:uv-weight-650 min-w-0 gap-3.75 uv-padding-4942d7b936 uv-v73883af7e9:w-full uv-v73883af7e9:flex uv-v73883af7e9:items-start uv-v73883af7e9:gap-2.75 uv-v73883af7e9:p-0 uv-v6d5e74b2a3:border-uv-danger uv-v6d5e74b2a3:bg-uv-c8b3083dabe" key={index}>
            <legend>
              <span className="reading-question-number w-8.5 h-8.5 uv-flex-bade52be50 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r933cc73310 text-uv-text-muted uv-font-family-320794573f text-uv-ff1713651e0">{formatNumber(locale, index + 1, { minimumIntegerDigits: 2, useGrouping: false })}</span>
              <span className="reading-question-heading grid gap-2 min-w-0 uv-vb3d336d01c:w-fit uv-veda02a0adb:text-uv-text uv-veda02a0adb:text-uv-fde89c2b680 uv-veda02a0adb:uv-line-height-2792cf2449">
                <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{t(typeKeys[question.type])}</span>
                <strong className="learning-content" dir="auto">{question.question}</strong>
              </span>
            </legend>
            <div className="reading-question-options grid uv-v586b3820a5:flex uv-v586b3820a5:gap-2.5 uv-v586b3820a5:items-start uv-v586b3820a5:uv-padding-df857c6c31 uv-v586b3820a5:uv-border-8d7f82f403 uv-v586b3820a5:rounded-uv-r0939007802 uv-v586b3820a5:cursor-pointer uv-max720:uv-v586b3820a5:p-2.75 gap-2.25">
              {question.options.map((option, optionIndex) => (
                <label
                  className={
                    "reading-question-option min-h-13 flex items-center gap-3 uv-padding-00c5ba1734 uv-border-8d7f82f403 rounded-uv-r0939007802 bg-uv-surface-raised cursor-pointer uv-transition-9909c190bf hover:border-uv-border-strong uv-v4928998ccc:border-uv-primary uv-v4928998ccc:bg-uv-cbdfd7cd038 uv-vc1297541ff:border-uv-success uv-vc1297541ff:bg-uv-cafddaf6a65 uv-v7e7ec2d1ab:border-uv-success uv-v7e7ec2d1ab:text-uv-success uv-v58bc5748c6:uv-outline-78a43235ea uv-v58bc5748c6:uv-outline-offset-a0179b92f3 uv-vcf5ce320fa:absolute uv-vcf5ce320fa:opacity-0 uv-vcf5ce320fa:w-0.25 uv-vcf5ce320fa:h-0.25 uv-v0e7cad6300:border-uv-primary uv-v0e7cad6300:text-uv-primary-strong" +
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
                  <span className="reading-option-letter w-6.75 h-6.75 uv-flex-09568740f0 grid uv-place-items-305047e96e uv-border-488f4b382f rounded-uv-r9bc5fefa1a text-uv-text-muted uv-font-family-320794573f text-uv-f58b84cc6f5" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                  <span className="reading-option-text learning-content text-uv-text-soft uv-line-height-2792cf2449" dir="auto">{option}</span>
                </label>
              ))}
            </div>
            {state.status === "success" ? (
              <p className={state.correct?.[index] ? "reading-answer-feedback is-correct m-0 uv-padding-2e9fc07eac rounded-uv-r933cc73310 text-uv-f845cf53f3a uv-line-height-aa8f289ebe uv-vc1297541ff:bg-uv-cafddaf6a65 uv-vc1297541ff:text-uv-success uv-vfbdf4ae9ba:bg-uv-c8b3083dabe uv-vfbdf4ae9ba:text-uv-danger" : "reading-answer-feedback is-wrong m-0 uv-padding-2e9fc07eac rounded-uv-r933cc73310 text-uv-f845cf53f3a uv-line-height-aa8f289ebe uv-vc1297541ff:bg-uv-cafddaf6a65 uv-vc1297541ff:text-uv-success uv-vfbdf4ae9ba:bg-uv-c8b3083dabe uv-vfbdf4ae9ba:text-uv-danger"}>
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
