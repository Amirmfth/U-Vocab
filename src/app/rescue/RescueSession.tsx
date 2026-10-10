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
      <div className="optimistic-error width-min-100pct-760px mx-auto grid grid-template-columns-20px-minmax-0-1fr-auto items-center gap-2.25 padding-10px-12px border-1px-solid-rgb-239-91-91-0p35 rounded-exact-13px bg-uv-c4aa6e841de text-uv-text-soft text-exact-0p74rem in-svg:text-uv-danger in-text-button:min-h-9 uv-max480:grid-template-columns-20px-minmax-0-1fr uv-max480:in-text-button:grid-column-2 uv-max480:in-text-button:justify-self-start" role="alert">
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
          className="text-button min-h-9.5 inline-flex items-center gap-1.5 border-0 bg-transparent text-uv-text-muted cursor-pointer"
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
    <main className="page focus-page review-session-shell flex flex-col w-full max-w-uv-5dbc91eac8 min-height-calc-100dvh-180px justify-center gap-2.5 in-learning-card:mx-auto in-learning-card:p-4 in-learning-prompt:margin-block-10px-16px in-grade-grid:sticky in-grade-grid:bottom-calc-96px-env-safe-area-inset-bottom in-grade-grid:z-index-4 in-grade-grid:p-1.75 in-grade-grid:border-1px-solid-border-2 in-grade-grid:rounded-exact-15px in-grade-grid:bg-uv-c54c3fe5d99 in-grade-grid:box-shadow-shadow in-grade-grid:backdrop-filter-blur-14px in-grade-grid-button:min-h-12.5 uv-min620:gap-5.5 uv-min940:gap-6 uv-min940:in-grade-grid:static uv-min940:in-grade-grid:p-0 uv-min940:in-grade-grid:border-0 uv-min940:in-grade-grid:bg-transparent uv-min940:in-grade-grid:box-shadow-none uv-min940:in-grade-grid:backdrop-filter-none">
      <header className="review-session-topbar width-min-100pct-760px margin-0-auto flex items-center justify-between text-uv-text-muted text-exact-0p72rem">
        <Link href="/rescue" className="text-link text-uv-primary-strong font-560 inline-flex items-center gap-1.5">
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
        <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem">
          <CheckCircle2 size={28} className="rescue-complete-icon text-uv-success" />
          <h1>
            {pendingCount > 0
              ? t("rescue.finishing")
              : errors.size > 0
                ? t("rescue.needSaving")
                : t("rescue.complete")}
          </h1>
          <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">
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
            <div className="hero-actions flex flex-col gap-2.5 margin-6px-0-0 uv-min620:flex-row uv-min620:items-center uv-min620:in-button-2:w-auto">
              <Link href="/rescue" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">
                {t("rescue.back")}
              </Link>
              <Link href="/review" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">
                {t("rescue.regularReview")}
              </Link>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
