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
    <section className="panel learning-card review-flashcard rescue-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 w-full flex flex-col gap-4.5 uv-vbc4e530e94:text-uv-f128d50102f max-w-uv-c078f10a0b uv-min-height-c618951de9 justify-between uv-vc7c4bbad24:text-uv-f8bea779a86 uv-vc7c4bbad24:uv-line-height-6ce245771a uv-vc7c4bbad24:font-bold rounded-uv-r6d27d54c6c">
      <div className="learning-card-head flex items-center justify-between gap-3 uv-va472f14696:text-uv-fe9d5fd6635">
        <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{t("rescue.reviewBadge")}</span>
        <span className="muted text-uv-text-muted">
          {formatNumber(locale, props.riskPercent)} {t("rescue.score")}
        </span>
      </div>

      <motion.div
        animate={{ rotateY: revealed ? 180 : 0 }}
        className="review-card-flip grid min-h-45 uv-padding-f2a961c8b0 uv-perspective-83c3d2d9cb"
        style={{ transformStyle: "preserve-3d" }}
        transition={{
          duration: reduceMotion ? 0 : 0.42,
          ease: "easeInOut",
        }}
      >
        <div
          aria-hidden={revealed}
          className="review-card-face review-card-front uv-grid-area-b6147458c1 uv-backface-visibility-99d72c7fc3 uv--webkit-backface-visibility-99d72c7fc3 flex flex-col gap-2.5 uv-vf3c20c0d1d:text-uv-f60ac4cf407 uv-va472f14696:text-uv-fed7a8e9b27"
        >
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("rescue.recall")}</p>
          <h1 className="learning-prompt learning-content m-0 text-uv-fb5d06bc327 uv-line-height-8e007eaa50 uv-letter-spacing-b22247dbaf uv-weight-560" dir="auto">
            {props.exercise.prompt}
          </h1>
          <div className="rescue-reasons flex flex-wrap gap-1.5 uv-v36c0309a03:uv-padding-24a7c581e4 uv-v36c0309a03:uv-border-7314b293fb uv-v36c0309a03:rounded-uv-red9ab892c5 uv-v36c0309a03:bg-uv-c8b3083dabe uv-v36c0309a03:text-uv-c7d351e814d uv-v36c0309a03:text-uv-f78eb7000a9" aria-label={t("rescue.why")}>
            {props.reasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        </div>

        <div
          aria-hidden={!revealed}
          className="answer-panel review-card-face review-card-back mt-1 p-4 uv-border-8d7f82f403 rounded-uv-rd50c223e36 bg-uv-surface-soft uv-grid-area-b6147458c1 uv-backface-visibility-99d72c7fc3 uv--webkit-backface-visibility-99d72c7fc3 flex flex-col gap-2 uv-transform-79cfc571da uv-ve6b262f465:text-uv-f8bea779a86 uv-ve6b262f465:uv-line-height-6ce245771a uv-ve6b262f465:font-bold uv-ve6b262f465:uv-letter-spacing-08161724d7 uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:text-uv-f1a8b10037e uv-vb19eb067c9:uv-line-height-05c248da4c uv-vf3c20c0d1d:text-uv-f60ac4cf407"
        >
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("review.check")}</p>
          <strong className="learning-content" dir="auto">
            {props.exercise.expected || label}
          </strong>
          {props.exercise.expected && props.exercise.expected !== label ? (
            <p className="word learning-content text-uv-f3951047c34 uv-weight-610 uv-letter-spacing-60c8585fce" lang={props.targetLanguage ?? "de"} dir="ltr">
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
          className="button button-primary review-reveal w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
          type="button"
          onClick={() => setRevealed(true)}
        >
          <Eye size={18} />
          {t("review.reveal")}
        </button>
      ) : (
        <>
          <div className="learning-card-head flex items-center justify-between gap-3 uv-va472f14696:text-uv-fe9d5fd6635">
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

          <div className="grade-grid review-grade-grid grid uv-grid-template-columns-dd0b1a1848 gap-2 uv-v8cd0743a41:block uv-min620:uv-grid-template-columns-0cbc4f103a uv-v513a7112a0:min-h-13.5 uv-v513a7112a0:flex-col uv-v513a7112a0:gap-0.5 uv-v9628fc471b:opacity-65 uv-v9628fc471b:text-uv-ff13a2a157c uv-vf34c80d831:cursor-wait">
            {ratings.map((rating, index) => (
              <button
                className={
                  "button w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383 " +
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
