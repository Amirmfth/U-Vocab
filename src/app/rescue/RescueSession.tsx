"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import type { ReviewGrade } from "@/lib/fsrs";
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
  const [errors, setErrors] = useState<Map<string, { input: RescueReviewInput; message: string }>>(new Map());
  const answeredIds = useRef(new Set<string>());
  const savingIds = useRef(new Set<string>());
  const activeStep = cards.findIndex((item, index) => index >= step && item !== null);
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
      setSavedCount((count) => count + 1);
    } catch (error) {
      setErrors((current) => new Map(current).set(input.userVocabularyId, {
        input,
        message: error instanceof Error ? error.message : "Could not save this rescue review.",
      }));
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

  const errorNotice = errors.size > 0 ? (
    <div className="optimistic-error" role="alert">
      <AlertCircle size={17} />
      <span>
        {errors.size} rescue answer{errors.size === 1 ? "" : "s"} could not be saved. {errors.values().next().value?.message}
      </span>
      <button
        className="text-button"
        type="button"
        onClick={() => {
          for (const { input } of errors.values()) void save(input);
        }}
      >
        <RotateCcw size={15} /> Retry
      </button>
    </div>
  ) : null;

  return (
    <main className="page focus-page review-session-shell">
      <header className="review-session-topbar">
        <Link href="/rescue" className="text-link">Rescue words</Link>
        <span>{Math.min(activeStep >= 0 ? activeStep + 1 : cards.length, cards.length)} / {cards.length}{pendingCount > 0 ? ` · ${pendingCount} saving` : ""}</span>
      </header>
      {errorNotice}
      {card ? (
        <RescueCard key={card.userVocabularyId} {...card} onGrade={grade} />
      ) : (
        <section className="page-header compact">
          <CheckCircle2 size={28} className="rescue-complete-icon" />
          <h1>{pendingCount > 0 ? "Finishing saves…" : errors.size > 0 ? "Rescue answers need saving" : "Rescue complete"}</h1>
          <p className="page-description">
            {pendingCount > 0
              ? "Your answers are being saved in the background."
              : errors.size > 0
                ? "Retry the failed answers above before leaving."
                : savedCount > 0 ? `${savedCount} rescue answers saved.` : "The selected words have been reviewed."}
          </p>
          {pendingCount === 0 && errors.size === 0 ? (
            <div className="hero-actions">
              <Link href="/rescue" className="button button-primary">Back to rescue words</Link>
              <Link href="/review" className="button button-secondary">Regular review</Link>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
