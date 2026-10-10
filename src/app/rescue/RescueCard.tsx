"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, RotateCcw } from "lucide-react";
import type { ExerciseDefinition } from "@/lib/exercises/types";
import type { ReviewGrade } from "@/lib/fsrs";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import type { MessageKey } from "@/i18n/core";

const ratings: Array<{
  grade: ReviewGrade;
  labelKey: MessageKey;
  hintKey: MessageKey;
}> = [
  {
    grade: "AGAIN",
    labelKey: "review.ratingAgain",
    hintKey: "rescue.ratingAgainHint",
  },
  {
    grade: "HARD",
    labelKey: "review.ratingHard",
    hintKey: "rescue.ratingHardHint",
  },
  {
    grade: "GOOD",
    labelKey: "review.ratingGood",
    hintKey: "rescue.ratingGoodHint",
  },
  {
    grade: "EASY",
    labelKey: "review.ratingEasy",
    hintKey: "rescue.ratingEasyHint",
  },
];

export type RescueSessionCard = {
  userVocabularyId: string;
  lemma: string;
  article: string | null;
  translations: Array<{ language: string; text: string }>;
  exercise: ExerciseDefinition;
  riskPercent: number;
  reasons: string[];
  targetLanguage?: "de" | "fr" | "en";
};

export function RescueCard(
  props: RescueSessionCard & {
    onGrade: (grade: ReviewGrade, startedAt: number) => void;
  },
) {
  const [revealed, setRevealed] = useState(false);
  const startedAt = useRef(Date.now());
  const reduceMotion = useReducedMotion();
  const { locale, t } = useI18n();
  const label = formatLexemeLabel(props);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        props.onGrade(
          ratings[Number(event.key) - 1].grade,
          startedAt.current,
        );
      }
    }

    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [props, revealed]);

  return (
    <section className="panel learning-card review-flashcard rescue-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 w-full flex flex-col gap-4.5 in-learning-prompt:text-uv-f128d50102f max-w-uv-c078f10a0b min-height-min-520px-70dvh justify-between in-review-card-front-learning-prompt:text-uv-f8bea779a86 in-review-card-front-learning-prompt:line-height-1p18 in-review-card-front-learning-prompt:font-bold rounded-uv-r6d27d54c6c">
      <div className="learning-card-head flex items-center justify-between gap-3 in-muted-2:text-uv-fe9d5fd6635">
        <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{t("rescue.reviewBadge")}</span>
        <span className="muted text-uv-text-muted">
          {formatNumber(locale, props.riskPercent)} {t("rescue.score")}
        </span>
      </div>

      <motion.div
        animate={{ rotateY: revealed ? 180 : 0 }}
        className="review-card-flip grid min-h-45 padding-20px-0 perspective-1200px"
        style={{ transformStyle: "preserve-3d" }}
        transition={{
          duration: reduceMotion ? 0 : 0.42,
          ease: "easeInOut",
        }}
      >
        <div
          aria-hidden={revealed}
          className="review-card-face review-card-front grid-area-1-1 backface-visibility-hidden webkit-backface-visibility-hidden flex flex-col gap-2.5 in-eyebrow:text-uv-f60ac4cf407 in-muted-2:text-uv-fed7a8e9b27"
        >
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("rescue.recall")}</p>
          <h1 className="learning-prompt learning-content m-0 text-uv-fb5d06bc327 line-height-1p25 letter-spacing-0p035em font-560" dir="auto">
            {props.exercise.prompt}
          </h1>
          <div className="rescue-reasons flex flex-wrap gap-1.5 in-span:padding-5px-8px in-span:border-1px-solid-rgb-255-107-122-0p18 in-span:rounded-uv-red9ab892c5 in-span:bg-uv-c8b3083dabe in-span:text-uv-c7d351e814d in-span:text-uv-f78eb7000a9" aria-label={t("rescue.why")}>
            {props.reasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        </div>

        <div
          aria-hidden={!revealed}
          className="answer-panel review-card-face review-card-back mt-1 p-4 border-1px-solid-border-2 rounded-uv-rd50c223e36 bg-uv-surface-soft grid-area-1-1 backface-visibility-hidden webkit-backface-visibility-hidden flex flex-col gap-2 transform-rotatey-180deg in-strong:text-uv-f8bea779a86 in-strong:line-height-1p18 in-strong:font-bold in-strong:letter-spacing-p025em in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:text-uv-f1a8b10037e in-p-2:line-height-1p55 in-eyebrow:text-uv-f60ac4cf407"
        >
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("review.check")}</p>
          <strong className="learning-content" dir="auto">
            {props.exercise.expected || label}
          </strong>
          {props.exercise.expected && props.exercise.expected !== label ? (
            <p className="word learning-content text-uv-f3951047c34 font-610 letter-spacing-0p03em" lang={props.targetLanguage ?? "de"} dir="ltr">
              {label}
            </p>
          ) : null}
          {props.translations.map((translation) => (
            <p
              key={translation.language + translation.text}
              className="learning-content"
              lang={translation.language === "fa" ? "fa" : "en"}
              dir={translation.language === "fa" ? "rtl" : "ltr"}
            >
              {translation.text}
            </p>
          ))}
        </div>
      </motion.div>

      {!revealed ? (
        <button
          className="button button-primary review-reveal w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
          type="button"
          onClick={() => setRevealed(true)}
        >
          <Eye size={18} />
          {t("review.reveal")}
        </button>
      ) : (
        <>
          <div className="learning-card-head flex items-center justify-between gap-3 in-muted-2:text-uv-fe9d5fd6635">
            <p className="muted text-uv-text-muted">{t("rescue.rateHelp")}</p>
            <button
              className="text-button min-h-9.5 inline-flex items-center gap-1.5 border-0 bg-transparent text-uv-text-muted cursor-pointer"
              type="button"
              onClick={() => setRevealed(false)}
            >
              <RotateCcw size={15} />
              {t("review.hide")}
            </button>
          </div>

          <div className="grade-grid review-grade-grid grid grid-template-columns-repeat-2-minmax-0-1fr gap-2 in-form:block uv-min620:grid-template-columns-repeat-4-minmax-0-1fr in-button-3:min-h-13.5 in-button-3:flex-col in-button-3:gap-0.5 in-button-small:opacity-65 in-button-small:text-uv-ff13a2a157c in-button-disabled:cursor-wait">
            {ratings.map((rating, index) => (
              <button
                className={
                  "button w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target " +
                  (rating.grade === "AGAIN"
                    ? "button-danger bg-uv-danger text-uv-cb667f4b109 border-current"
                    : rating.grade === "EASY"
                      ? "button-success bg-uv-success text-uv-c1667a9177b"
                      : "button-secondary bg-uv-surface-raised border-uv-border text-uv-text")
                }
                key={rating.grade}
                onClick={() =>
                  props.onGrade(rating.grade, startedAt.current)
                }
                type="button"
                title={t(rating.hintKey)}
              >
                <span>{t(rating.labelKey)}</span>
                <small>{formatNumber(locale, index + 1)}</small>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
