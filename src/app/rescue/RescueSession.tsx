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
      <div className="optimistic-error uv-width-2e40884b7a mx-auto grid uv-grid-template-columns-7e830708d5 items-center gap-2.25 uv-padding-df857c6c31 uv-border-d12aa08a65 rounded-uv-r233710a71e bg-uv-c4aa6e841de text-uv-text-soft text-uv-f63777cce16 uv-v872d6ea02a:text-uv-danger uv-v0012ce6f5a:min-h-9 uv-max480:uv-grid-template-columns-eef7441aab uv-max480:uv-v0012ce6f5a:uv-grid-column-da4b9237ba uv-max480:uv-v0012ce6f5a:uv-justify-self-2b020927d3" role="alert">
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
    <main className="page focus-page review-session-shell flex flex-col w-full max-w-uv-5dbc91eac8 uv-min-height-c98658d88e justify-center gap-2.5 uv-vb0069fed3b:mx-auto uv-vb0069fed3b:p-4 uv-vbc4e530e94:uv-margin-block-e7382af1bd uv-vdd5d37011e:sticky uv-vdd5d37011e:uv-bottom-19e81ff378 uv-vdd5d37011e:uv-z-index-1b64538924 uv-vdd5d37011e:p-1.75 uv-vdd5d37011e:uv-border-8d7f82f403 uv-vdd5d37011e:rounded-uv-r344c386330 uv-vdd5d37011e:bg-uv-c54c3fe5d99 uv-vdd5d37011e:uv-box-shadow-4ee177db8b uv-vdd5d37011e:uv-backdrop-filter-fa0b2b5363 uv-vef46e3aa8e:min-h-12.5 uv-min620:gap-5.5 uv-min940:gap-6 uv-min940:uv-vdd5d37011e:static uv-min940:uv-vdd5d37011e:p-0 uv-min940:uv-vdd5d37011e:border-0 uv-min940:uv-vdd5d37011e:bg-transparent uv-min940:uv-vdd5d37011e:uv-box-shadow-71f8e7976e uv-min940:uv-vdd5d37011e:uv-backdrop-filter-71f8e7976e">
      <header className="review-session-topbar uv-width-2e40884b7a uv-margin-ddbc4f5b25 flex items-center justify-between text-uv-text-muted text-uv-ff1713651e0">
        <Link href="/rescue" className="text-link text-uv-primary-strong uv-weight-560 inline-flex items-center gap-1.5">
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
        <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade">
          <CheckCircle2 size={28} className="rescue-complete-icon text-uv-success" />
          <h1>
            {pendingCount > 0
              ? t("rescue.finishing")
              : errors.size > 0
                ? t("rescue.needSaving")
                : t("rescue.complete")}
          </h1>
          <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">
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
            <div className="hero-actions flex flex-col gap-2.5 uv-margin-66a0389558 uv-min620:flex-row uv-min620:items-center uv-min620:uv-vcded88c612:w-auto">
              <Link href="/rescue" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">
                {t("rescue.back")}
              </Link>
              <Link href="/review" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">
                {t("rescue.regularReview")}
              </Link>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
