"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import type { ReviewGrade } from "@/lib/fsrs";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import { RescueCard, type RescueSessionCard } from "./RescueCard";
import { submitRescueReview, type RescueReviewInput } from "./actions";

export function RescueSession({
  cards,
  initialStep,
}: {
  cards: Array<RescueSessionCard | null>;
  initialStep: number;
}) {
  const [step, setStep] = useState(initialStep);
  const [pendingCount, setPendingCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [errors, setErrors] = useState<
    Map<string, { input: RescueReviewInput; message: string }>
  >(new Map());
  const answeredIds = useRef(new Set<string>());
  const savingIds = useRef(new Set<string>());
  const { locale, t } = useI18n();
  const activeStep = cards.findIndex(
    (item, index) => index >= step && item !== null,
  );
  const card = activeStep >= 0 ? cards[activeStep] : null;

  async function save(input: RescueReviewInput) {
    if (savingIds.current.has(input.userVocabularyId)) return;
    savingIds.current.add(input.userVocabularyId);
    setPendingCount((count) => count + 1);
    setErrors((current) => {
      if (!current.has(input.userVocabularyId)) return current;
      const next = new Map(current);
      next.delete(input.userVocabularyId);
      return next;
    });

    try {
      const result = await submitRescueReview(input);
      if (result.status === "error") throw new Error(result.message);
      window.dispatchEvent(new Event("u-vocab:review-count-changed"));
      setSavedCount((count) => count + 1);
    } catch (error) {
      setErrors((current) =>
        new Map(current).set(input.userVocabularyId, {
          input,
          message:
            error instanceof Error ? error.message : t("rescue.saveError"),
        }),
      );
    } finally {
      savingIds.current.delete(input.userVocabularyId);
      setPendingCount((count) => count - 1);
    }
  }

  function grade(grade: ReviewGrade, startedAt: number) {
    if (!card || answeredIds.current.has(card.userVocabularyId)) return;
    answeredIds.current.add(card.userVocabularyId);
    const nextStep = activeStep + 1;
    setStep(nextStep);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(nextStep));
    window.history.replaceState(null, "", url);
    void save({
      userVocabularyId: card.userVocabularyId,
      grade,
      exerciseType: card.exercise.type,
      prompt: card.exercise.prompt,
      startedAt,
    });
  }

  const errorNotice =
    errors.size > 0 ? (
      <div className="optimistic-error [width:min(100%,_760px)] [margin-inline:auto] [display:grid] [grid-template-columns:20px_minmax(0,_1fr)_auto] [align-items:center] [gap:9px] [padding:10px_12px] [border:1px_solid_rgba(239,_91,_91,_0.35)] [border-radius:13px] [background:rgba(239,_91,_91,_0.08)] [color:var(--text-soft)] [font-size:0.74rem] [&_>_svg]:[color:var(--danger)] [&_.text-button]:[min-height:36px] max-[480px]:[grid-template-columns:20px_minmax(0,_1fr)] max-[480px]:[&_.text-button]:[grid-column:2] max-[480px]:[&_.text-button]:[justify-self:start]" role="alert">
        <AlertCircle size={17} />
        <span>
          {t.plural(
            {
              one: "rescue.saveErrors.one",
              other: "rescue.saveErrors.other",
            },
            errors.size,
            { count: formatNumber(locale, errors.size) },
          )}{" "}
          {errors.values().next().value?.message}
        </span>
        <button
          className="text-button [min-height:38px] [display:inline-flex] [align-items:center] [gap:6px] [border:0] [background:transparent] [color:var(--text-muted)] [cursor:pointer]"
          type="button"
          onClick={() => {
            for (const { input } of errors.values()) void save(input);
          }}
        >
          <RotateCcw size={15} /> {t("review.retry")}
        </button>
      </div>
    ) : null;

  const position = Math.min(
    activeStep >= 0 ? activeStep + 1 : cards.length,
    cards.length,
  );

  return (
    <main className="page focus-page review-session-shell [display:flex] [flex-direction:column] [width:100%] [max-width:780px] [min-height:calc(100dvh_-_180px)] [justify-content:center] [gap:10px] [&_.learning-card]:[margin-inline:auto] [&_.learning-card]:[padding:16px] [&_.learning-prompt]:[margin-block:10px_16px] [&_.grade-grid]:[position:sticky] [&_.grade-grid]:[bottom:calc(96px_+_env(safe-area-inset-bottom))] [&_.grade-grid]:[z-index:4] [&_.grade-grid]:[padding:7px] [&_.grade-grid]:[border:1px_solid_var(--border)] [&_.grade-grid]:[border-radius:15px] [&_.grade-grid]:[background:rgba(17,_17,_20,_0.94)] [&_.grade-grid]:[box-shadow:var(--shadow)] [&_.grade-grid]:[backdrop-filter:blur(14px)] [&_.grade-grid_.button]:[min-height:50px] min-[620px]:[gap:22px] min-[940px]:[gap:24px] min-[940px]:[&_.grade-grid]:[position:static] min-[940px]:[&_.grade-grid]:[padding:0] min-[940px]:[&_.grade-grid]:[border:0] min-[940px]:[&_.grade-grid]:[background:transparent] min-[940px]:[&_.grade-grid]:[box-shadow:none] min-[940px]:[&_.grade-grid]:[backdrop-filter:none]">
      <header className="review-session-topbar [width:min(100%,_760px)] [margin:0_auto] [display:flex] [align-items:center] [justify-content:space-between] [color:var(--text-muted)] [font-size:0.72rem]">
        <Link href="/rescue" className="text-link [color:var(--primary-strong)] [font-weight:560] [display:inline-flex] [align-items:center] [gap:6px]">
          {t("rescue.title")}
        </Link>
        <span>
          {formatNumber(locale, position)} / {formatNumber(locale, cards.length)}
          {pendingCount > 0
            ? " · " +
              t("rescue.saving", {
                count: formatNumber(locale, pendingCount),
              })
            : ""}
        </span>
      </header>
      {errorNotice}
      {card ? (
        <RescueCard
          key={card.userVocabularyId}
          {...card}
          onGrade={grade}
        />
      ) : (
        <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]">
          <CheckCircle2 size={28} className="rescue-complete-icon [color:var(--success)]" />
          <h1>
            {pendingCount > 0
              ? t("rescue.finishing")
              : errors.size > 0
                ? t("rescue.needSaving")
                : t("rescue.complete")}
          </h1>
          <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">
            {pendingCount > 0
              ? t("rescue.savingHelp")
              : errors.size > 0
                ? t("rescue.retryHelp")
                : savedCount > 0
                  ? t.plural(
                      {
                        one: "rescue.saved.one",
                        other: "rescue.saved.other",
                      },
                      savedCount,
                      { count: formatNumber(locale, savedCount) },
                    )
                  : t("rescue.reviewed")}
          </p>
          {pendingCount === 0 && errors.size === 0 ? (
            <div className="hero-actions [display:flex] [flex-direction:column] [gap:10px] [margin:6px_0_0] min-[620px]:[flex-direction:row] min-[620px]:[align-items:center] min-[620px]:[&_.button]:[width:auto]">
              <Link href="/rescue" className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">
                {t("rescue.back")}
              </Link>
              <Link href="/review" className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">
                {t("rescue.regularReview")}
              </Link>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
