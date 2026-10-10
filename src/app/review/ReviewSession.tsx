"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RotateCcw } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { startOperation } from "@/lib/performance";
import {
  optimisticReviewAdvance,
  REVIEW_QUEUE_QUERY_POLICY,
  shouldRefillReviewQueue,
} from "@/lib/review-query";
import type { ReviewGrade } from "@/lib/fsrs";
import type { ReviewQueueData } from "@/lib/review-queue";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import {
  submitReviewMutation,
  type ReviewMutationInput,
} from "./actions";
import { ReviewCard } from "./ReviewCard";
import { captureProductEvent } from "@/lib/analytics/client";

async function fetchReviewQueue(
  excludeIds: ReadonlySet<string>,
  refreshError: string,
): Promise<ReviewQueueData> {
  const url = new URL("/api/review/queue", window.location.origin);
  for (const id of excludeIds) url.searchParams.append("exclude", id);
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (response.status === 401) {
    window.location.assign(
      "/login?returnTo=" +
        encodeURIComponent(window.location.pathname + window.location.search),
    );
    throw new Error("Unauthorized");
  }
  if (!response.ok) throw new Error(refreshError);

  return response.json() as Promise<ReviewQueueData>;
}

export function ReviewSession({
  initialData,
  userScope,
}: {
  initialData: ReviewQueueData;
  userScope: string;
}) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const { locale, t } = useI18n();
  const queueKey = queryKeys.review.queue(userScope);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, again: 0 });
  const answeredIds = useRef(new Set<string>());
  const unsavedIds = useRef(new Set<string>());
  const [pendingCount, setPendingCount] = useState(0);
  const [saveErrors, setSaveErrors] = useState<
    Map<string, { input: ReviewMutationInput; message: string }>
  >(new Map());

  const completionCaptured = useRef(false);

  useEffect(() => {
    captureProductEvent("review_session_started", {
      dueCount: initialData.dueCount,
      mode: "standard",
    });
  }, [initialData.dueCount]);


  const queue = useQuery({
    queryKey: queueKey,
    queryFn: async () => {
      const data = await fetchReviewQueue(unsavedIds.current, t("review.refreshError"));
      return {
        ...data,
        cards: data.cards.filter(
          (item) => !answeredIds.current.has(item.userVocabularyId),
        ),
      };
    },
    initialData,
    ...REVIEW_QUEUE_QUERY_POLICY,
  });

  const review = useMutation({
    mutationFn: async (input: ReviewMutationInput) => {
      const result = await submitReviewMutation(input);
      if (result.status === "error") {
        if (result.message.includes("Unauthorized")) {
          window.location.assign(
            "/login?returnTo=" +
              encodeURIComponent(window.location.pathname + window.location.search),
          );
        }
        throw new Error(result.message);
      }
      return result;
    },
    onMutate: (input) => {
      const perf = startOperation("interaction.review_rating", {
        grade: input.grade,
        optimistic: true,
      });
      unsavedIds.current.add(input.userVocabularyId);
      setSaveErrors((errors) => {
        if (!errors.has(input.userVocabularyId)) return errors;
        const next = new Map(errors);
        next.delete(input.userVocabularyId);
        return next;
      });
      setPendingCount((count) => count + 1);
      queryClient.setQueryData<ReviewQueueData>(queueKey, (current) =>
        current
          ? optimisticReviewAdvance(current, input.userVocabularyId)
          : current,
      );
      const current = queryClient.getQueryData<ReviewQueueData>(queueKey);
      if (current && shouldRefillReviewQueue(current)) {
        void queryClient.invalidateQueries({ queryKey: queueKey });
      }
      return { perf };
    },
    onError: (error, input, context) => {
      setSaveErrors((errors) =>
        new Map(errors).set(input.userVocabularyId, {
          input,
          message: error instanceof Error ? error.message : t("review.saveError"),
        }),
      );
      context?.perf.fail(error, { rolledBack: false });
    },
    onSuccess: (_result, input, context) => {
      window.dispatchEvent(new Event("u-vocab:review-count-changed"));
      context?.perf.success({ rolledBack: false });
      unsavedIds.current.delete(input.userVocabularyId);
      setSaveErrors((errors) => {
        if (!errors.has(input.userVocabularyId)) return errors;
        const next = new Map(errors);
        next.delete(input.userVocabularyId);
        return next;
      });
      setSessionStats((value) => ({
        reviewed: value.reviewed + 1,
        again: value.again + (input.grade === "AGAIN" ? 1 : 0),
      }));
    },
    onSettled: () => {
      setPendingCount((count) => count - 1);
      const current = queryClient.getQueryData<ReviewQueueData>(queueKey);
      if (
        !current ||
        shouldRefillReviewQueue(current) ||
        current.cards.length === 0
      ) {
        void queryClient.invalidateQueries({ queryKey: queueKey });
      }
    },
  });

  const queueData = queue.data ?? initialData;
  const card = queueData.cards[0];

  useEffect(() => {
    if (
      completionCaptured.current ||
      card ||
      pendingCount > 0 ||
      queue.isFetching ||
      queueData.dueCount > 0 ||
      sessionStats.reviewed < 1
    ) {
      return;
    }
    completionCaptured.current = true;
    captureProductEvent("review_session_completed", {
      answeredCount: sessionStats.reviewed,
      durationMs: null,
    });
  }, [card, pendingCount, queue.isFetching, queueData.dueCount, sessionStats.reviewed]);
  const saveErrorNotice =
    saveErrors.size > 0 ? (
      <div className="optimistic-error uv-width-2e40884b7a mx-auto grid uv-grid-template-columns-7e830708d5 items-center gap-2.25 uv-padding-df857c6c31 uv-border-d12aa08a65 rounded-uv-r233710a71e bg-uv-c4aa6e841de text-uv-text-soft text-uv-f63777cce16 uv-v872d6ea02a:text-uv-danger uv-v0012ce6f5a:min-h-9 uv-max480:uv-grid-template-columns-eef7441aab uv-max480:uv-v0012ce6f5a:uv-grid-column-da4b9237ba uv-max480:uv-v0012ce6f5a:uv-justify-self-2b020927d3" role="alert">
        <AlertCircle size={17} />
        <span>
          {t.plural(
            { one: "review.saveErrors.one", other: "review.saveErrors.other" },
            saveErrors.size,
            { count: formatNumber(locale, saveErrors.size) },
          )}{" "}
          {saveErrors.values().next().value?.message}
        </span>
        <button
          className="text-button min-h-9.5 inline-flex items-center gap-1.5 border-0 bg-transparent text-uv-text-muted cursor-pointer"
          onClick={() => {
            for (const { input } of saveErrors.values()) review.mutate(input);
          }}
          type="button"
        >
          <RotateCcw size={15} />
          {t("review.retry")}
        </button>
      </div>
    ) : null;

  function grade(grade: ReviewGrade, startedAt: number) {
    if (!card || answeredIds.current.has(card.userVocabularyId)) return;
    answeredIds.current.add(card.userVocabularyId);
    review.mutate({
      userVocabularyId: card.userVocabularyId,
      grade,
      exerciseType: card.review.exerciseType,
      prompt: card.review.front.prompt,
      startedAt,
    });
  }

  if (!card && (pendingCount > 0 || queue.isFetching || queueData.dueCount > 0)) {
    return (
      <main className="page review-session-shell flex flex-col uv-min-height-c98658d88e justify-center gap-2.5 uv-vb0069fed3b:mx-auto uv-vb0069fed3b:p-4 uv-vbc4e530e94:uv-margin-block-e7382af1bd uv-vdd5d37011e:sticky uv-vdd5d37011e:uv-bottom-19e81ff378 uv-vdd5d37011e:uv-z-index-1b64538924 uv-vdd5d37011e:p-1.75 uv-vdd5d37011e:uv-border-8d7f82f403 uv-vdd5d37011e:rounded-uv-r344c386330 uv-vdd5d37011e:bg-uv-c54c3fe5d99 uv-vdd5d37011e:uv-box-shadow-4ee177db8b uv-vdd5d37011e:uv-backdrop-filter-fa0b2b5363 uv-vef46e3aa8e:min-h-12.5 uv-min620:gap-5.5 uv-min940:gap-6 uv-min940:uv-vdd5d37011e:static uv-min940:uv-vdd5d37011e:p-0 uv-min940:uv-vdd5d37011e:border-0 uv-min940:uv-vdd5d37011e:bg-transparent uv-min940:uv-vdd5d37011e:uv-box-shadow-71f8e7976e uv-min940:uv-vdd5d37011e:uv-backdrop-filter-71f8e7976e">
        <header className="review-session-topbar uv-width-2e40884b7a uv-margin-ddbc4f5b25 flex items-center justify-between text-uv-text-muted text-uv-ff1713651e0">
          <Link href="/review" className="text-link text-uv-primary-strong uv-weight-560 inline-flex items-center gap-1.5">{t("nav.review")}</Link>
          <span>{t("review.remaining", { count: formatNumber(locale, queueData.dueCount) })}</span>
        </header>
        {saveErrorNotice}
        <section className="panel optimistic-next-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c uv-width-2e40884b7a mx-auto flex flex-col gap-3 uv-v22810335d8:text-uv-text-muted uv-v22810335d8:text-uv-ff1713651e0" aria-live="polite">
          <div className="skeleton skeleton-kicker rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-22.5 h-3" />
          <div className="skeleton skeleton-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-86fd0a9d90 h-13.5" />
          <div className="skeleton skeleton-card uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-28 rounded-uv-r02a0a889dd" />
          <span>{t("review.loadingNext")}</span>
          {queue.isError ? (
            <button
              className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
              type="button"
              onClick={() => void queue.refetch()}
            >
              {t("review.retryLoading")}
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="page review-session-shell flex flex-col uv-min-height-c98658d88e justify-center gap-2.5 uv-vb0069fed3b:mx-auto uv-vb0069fed3b:p-4 uv-vbc4e530e94:uv-margin-block-e7382af1bd uv-vdd5d37011e:sticky uv-vdd5d37011e:uv-bottom-19e81ff378 uv-vdd5d37011e:uv-z-index-1b64538924 uv-vdd5d37011e:p-1.75 uv-vdd5d37011e:uv-border-8d7f82f403 uv-vdd5d37011e:rounded-uv-r344c386330 uv-vdd5d37011e:bg-uv-c54c3fe5d99 uv-vdd5d37011e:uv-box-shadow-4ee177db8b uv-vdd5d37011e:uv-backdrop-filter-fa0b2b5363 uv-vef46e3aa8e:min-h-12.5 uv-min620:gap-5.5 uv-min940:gap-6 uv-min940:uv-vdd5d37011e:static uv-min940:uv-vdd5d37011e:p-0 uv-min940:uv-vdd5d37011e:border-0 uv-min940:uv-vdd5d37011e:bg-transparent uv-min940:uv-vdd5d37011e:uv-box-shadow-71f8e7976e uv-min940:uv-vdd5d37011e:uv-backdrop-filter-71f8e7976e">
        {saveErrorNotice}
        <section className="empty-state compact-empty flex flex-col gap-3 items-start uv-border-c8a81946fb rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
          <strong>
            {saveErrors.size > 0 ? t("review.needSaving") : t("review.complete")}
          </strong>
          <span className="muted text-uv-text-muted">
            {t("review.sessionStats", {
              reviewed: formatNumber(locale, sessionStats.reviewed),
              again: formatNumber(locale, sessionStats.again),
            })}
          </span>
          <div className="ia-empty-actions flex flex-col gap-2 uv-min620:flex-row uv-min620:items-center">
            <Link href="/review" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">{t("review.back")}</Link>
            <Link href="/practice" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">{t("nav.practice")}</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page review-session-shell flex flex-col uv-min-height-c98658d88e justify-center gap-2.5 uv-vb0069fed3b:mx-auto uv-vb0069fed3b:p-4 uv-vbc4e530e94:uv-margin-block-e7382af1bd uv-vdd5d37011e:sticky uv-vdd5d37011e:uv-bottom-19e81ff378 uv-vdd5d37011e:uv-z-index-1b64538924 uv-vdd5d37011e:p-1.75 uv-vdd5d37011e:uv-border-8d7f82f403 uv-vdd5d37011e:rounded-uv-r344c386330 uv-vdd5d37011e:bg-uv-c54c3fe5d99 uv-vdd5d37011e:uv-box-shadow-4ee177db8b uv-vdd5d37011e:uv-backdrop-filter-fa0b2b5363 uv-vef46e3aa8e:min-h-12.5 uv-min620:gap-5.5 uv-min940:gap-6 uv-min940:uv-vdd5d37011e:static uv-min940:uv-vdd5d37011e:p-0 uv-min940:uv-vdd5d37011e:border-0 uv-min940:uv-vdd5d37011e:bg-transparent uv-min940:uv-vdd5d37011e:uv-box-shadow-71f8e7976e uv-min940:uv-vdd5d37011e:uv-backdrop-filter-71f8e7976e">
      <header className="review-session-topbar uv-width-2e40884b7a uv-margin-ddbc4f5b25 flex items-center justify-between text-uv-text-muted text-uv-ff1713651e0">
        <Link href="/review" className="text-link text-uv-primary-strong uv-weight-560 inline-flex items-center gap-1.5">{t("nav.review")}</Link>
        <span>
          {t("review.remaining", { count: formatNumber(locale, queueData.dueCount) })}
          {pendingCount > 0
            ? " · " + t("review.saving", { count: formatNumber(locale, pendingCount) })
            : ""}
        </span>
      </header>

      {saveErrorNotice}

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, x: -18 }}
          initial={reduceMotion ? false : { opacity: 0, x: 18 }}
          key={card.userVocabularyId}
          transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
        >
          <ReviewCard card={card} onGrade={grade} />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
