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
      <div className="optimistic-error" role="alert">
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
          className="text-button"
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
    <main className="page focus-page review-session-shell">
      <header className="review-session-topbar">
        <Link href="/rescue" className="text-link">
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
        <section className="page-header compact">
          <CheckCircle2 size={28} className="rescue-complete-icon" />
          <h1>
            {pendingCount > 0
              ? t("rescue.finishing")
              : errors.size > 0
                ? t("rescue.needSaving")
                : t("rescue.complete")}
          </h1>
          <p className="page-description">
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
            <div className="hero-actions">
              <Link href="/rescue" className="button button-primary">
                {t("rescue.back")}
              </Link>
              <Link href="/review" className="button button-secondary">
                {t("rescue.regularReview")}
              </Link>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
