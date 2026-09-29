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
    <section className="panel learning-card review-flashcard rescue-card">
      <div className="learning-card-head">
        <span className="badge">{t("rescue.reviewBadge")}</span>
        <span className="muted">
          {formatNumber(locale, props.riskPercent)} {t("rescue.score")}
        </span>
      </div>

      <motion.div
        animate={{ rotateY: revealed ? 180 : 0 }}
        className="review-card-flip"
        style={{ transformStyle: "preserve-3d" }}
        transition={{
          duration: reduceMotion ? 0 : 0.42,
          ease: "easeInOut",
        }}
      >
        <div
          aria-hidden={revealed}
          className="review-card-face review-card-front"
        >
          <p className="eyebrow">{t("rescue.recall")}</p>
          <h1 className="learning-prompt learning-content" dir="auto">
            {props.exercise.prompt}
          </h1>
          <div className="rescue-reasons" aria-label={t("rescue.why")}>
            {props.reasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        </div>

        <div
          aria-hidden={!revealed}
          className="answer-panel review-card-face review-card-back"
        >
          <p className="eyebrow">{t("review.check")}</p>
          <strong className="learning-content" dir="auto">
            {props.exercise.expected || label}
          </strong>
          {props.exercise.expected && props.exercise.expected !== label ? (
            <p className="word learning-content" lang="de" dir="ltr">
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
          className="button button-primary review-reveal"
          type="button"
          onClick={() => setRevealed(true)}
        >
          <Eye size={18} />
          {t("review.reveal")}
        </button>
      ) : (
        <>
          <div className="learning-card-head">
            <p className="muted">{t("rescue.rateHelp")}</p>
            <button
              className="text-button"
              type="button"
              onClick={() => setRevealed(false)}
            >
              <RotateCcw size={15} />
              {t("review.hide")}
            </button>
          </div>

          <div className="grade-grid review-grade-grid">
            {ratings.map((rating, index) => (
              <button
                className={
                  "button " +
                  (rating.grade === "AGAIN"
                    ? "button-danger"
                    : rating.grade === "EASY"
                      ? "button-success"
                      : "button-secondary")
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
