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
    <section className="panel learning-card review-flashcard [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [width:100%] [max-width:760px] [display:flex] [flex-direction:column] [gap:18px] [&_.learning-prompt]:[font-size:clamp(1.55rem,_7vw,_2.35rem)] [min-height:min(520px,_70dvh)] [justify-content:space-between] [&_.review-card-front_.learning-prompt]:[font-size:clamp(1.9rem,_5vw,_2.8rem)] [&_.review-card-front_.learning-prompt]:[line-height:1.18] [&_.review-card-front_.learning-prompt]:[font-weight:700] [border-radius:18px]">
      <div className="learning-card-head [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_>_.muted]:[font-size:0.78rem]">
        <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{card.review.family.replaceAll("_", " ").toLowerCase()}</span>
        <span className="muted [color:var(--text-muted)]">{t("review.activeRecall")}</span>
      </div>

      <motion.div
        animate={{ rotateY: revealed ? 180 : 0 }}
        className="review-card-flip [display:grid] [min-height:180px] [padding:20px_0] [perspective:1200px]"
        style={{ transformStyle: "preserve-3d" }}
        transition={{ duration: reduceMotion ? 0 : 0.42, ease: "easeInOut" }}
      >
        <div aria-hidden={revealed} className="review-card-face review-card-front [grid-area:1_/_1] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [display:flex] [flex-direction:column] [gap:10px] [&_.eyebrow]:[font-size:.75rem] [&_>_.muted]:[font-size:.95rem]">
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("review.recall")}</p>
          <h2
            className="learning-prompt learning-content [margin:0] [font-size:clamp(1.35rem,_6vw,_2rem)] [line-height:1.25] [letter-spacing:-0.035em] [font-weight:560]"
            lang={card.review.front.language}
            dir={direction(card.review.front.language)}
          >
            {card.review.front.prompt}
          </h2>
          {card.review.front.hint ? (
            <p
              className="muted learning-content [color:var(--text-muted)]"
              lang={card.review.front.language}
              dir={direction(card.review.front.language)}
            >
              {card.review.front.hint}
            </p>
          ) : null}
        </div>

        <div aria-hidden={!revealed} className="answer-panel review-card-face review-card-back [margin-top:4px] [padding:16px] [border:1px_solid_var(--border)] [border-radius:var(--radius-md)] [background:var(--surface-soft)] [grid-area:1_/_1] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [display:flex] [flex-direction:column] [gap:8px] [transform:rotateY(180deg)] [&_>_strong]:[font-size:clamp(1.9rem,_5vw,_2.8rem)] [&_>_strong]:[line-height:1.18] [&_>_strong]:[font-weight:700] [&_>_strong]:[letter-spacing:-.025em] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[font-size:clamp(.95rem,_2.5vw,_1.1rem)] [&_p]:[line-height:1.55] [&_.eyebrow]:[font-size:.75rem]">
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("review.check")}</p>
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
          className="button button-primary review-reveal [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
          type="button"
          onClick={() => setRevealed(true)}
        >
          <Eye size={18} />
          {t("review.reveal")}
        </button>
      ) : (
        <>
          <div className="learning-card-head [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_>_.muted]:[font-size:0.78rem]">
            <p className="muted [color:var(--text-muted)]">{t("review.rateHelp")}</p>
            <button className="text-button [min-height:38px] [display:inline-flex] [align-items:center] [gap:6px] [border:0] [background:transparent] [color:var(--text-muted)] [cursor:pointer]" type="button" onClick={() => setRevealed(false)}>
              <RotateCcw size={15} />
              {t("review.hide")}
            </button>
          </div>
          <div className="grade-grid review-grade-grid [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:8px] [&_form]:[display:block] min-[620px]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] [&_button]:[min-height:54px] [&_button]:[flex-direction:column] [&_button]:[gap:2px] [&_button_small]:[opacity:.65] [&_button_small]:[font-size:.62rem] [&_.button:disabled]:[cursor:wait]">
            {ratings.map((rating, index) => (
              <button
                className={
                  "button [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)] " +
                  (rating.grade === "AGAIN"
                    ? "button-danger [background:var(--danger)] [color:#19070a] [border-color:currentColor]"
                    : rating.grade === "EASY"
                      ? "button-success [background:var(--success)] [color:#07140e]"
                      : "button-secondary [background:var(--surface-raised)] [border-color:var(--border)] [color:var(--text)]")
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
