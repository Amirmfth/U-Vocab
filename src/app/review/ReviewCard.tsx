"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, RotateCcw } from "lucide-react";
import type { ReviewGrade } from "@/lib/fsrs";
import type { ReviewQueueCard } from "@/lib/review-queue";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/core";
import { formatNumber } from "@/i18n/format";

const ratings: Array<{
  grade: ReviewGrade;
  labelKey: MessageKey;
  hintKey: MessageKey;
}> = [
  { grade: "AGAIN", labelKey: "review.ratingAgain", hintKey: "review.ratingAgainHint" },
  { grade: "HARD", labelKey: "review.ratingHard", hintKey: "review.ratingHardHint" },
  { grade: "GOOD", labelKey: "review.ratingGood", hintKey: "review.ratingGoodHint" },
  { grade: "EASY", labelKey: "review.ratingEasy", hintKey: "review.ratingEasyHint" },
];

function direction(language: "de" | "fr" | "en" | "fa") {
  return language === "fa" ? ("rtl" as const) : ("ltr" as const);
}

export function ReviewCard({
  card,
  onGrade,
}: {
  card: ReviewQueueCard;
  onGrade: (grade: ReviewGrade, startedAt: number) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const startedAt = useRef(Date.now());
  const reduceMotion = useReducedMotion();
  const { locale, t } = useI18n();

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        onGrade(ratings[Number(event.key) - 1].grade, startedAt.current);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onGrade, revealed]);

  return (
    <section className="panel learning-card review-flashcard">
      <div className="learning-card-head">
        <span className="badge">{card.review.family.replaceAll("_", " ").toLowerCase()}</span>
        <span className="muted">{t("review.activeRecall")}</span>
      </div>

      <motion.div
        animate={{ rotateY: revealed ? 180 : 0 }}
        className="review-card-flip"
        style={{ transformStyle: "preserve-3d" }}
        transition={{ duration: reduceMotion ? 0 : 0.42, ease: "easeInOut" }}
      >
        <div aria-hidden={revealed} className="review-card-face review-card-front">
          <p className="eyebrow">{t("review.recall")}</p>
          <h2
            className="learning-prompt learning-content"
            lang={card.review.front.language}
            dir={direction(card.review.front.language)}
          >
            {card.review.front.prompt}
          </h2>
          {card.review.front.hint ? (
            <p
              className="muted learning-content"
              lang={card.review.front.language}
              dir={direction(card.review.front.language)}
            >
              {card.review.front.hint}
            </p>
          ) : null}
        </div>

        <div aria-hidden={!revealed} className="answer-panel review-card-face review-card-back">
          <p className="eyebrow">{t("review.check")}</p>
          <strong
            className="learning-content"
            lang={card.review.back.language}
            dir={direction(card.review.back.language)}
          >
            {card.review.back.answer}
          </strong>
          {card.review.back.details.map((detail) => (
            <p
              key={detail}
              className="learning-content"
              lang={card.review.back.detailsLanguage}
              dir={direction(card.review.back.detailsLanguage)}
            >
              {detail}
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
            <p className="muted">{t("review.rateHelp")}</p>
            <button className="text-button" type="button" onClick={() => setRevealed(false)}>
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
                onClick={() => onGrade(rating.grade, startedAt.current)}
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
