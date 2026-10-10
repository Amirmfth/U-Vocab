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
      <div className="optimistic-error width-min-100pct-760px mx-auto grid grid-template-columns-20px-minmax-0-1fr-auto items-center gap-2.25 padding-10px-12px border-1px-solid-rgb-239-91-91-0p35 rounded-uv-r233710a71e bg-uv-c4aa6e841de text-uv-text-soft text-uv-f63777cce16 in-svg:text-uv-danger in-text-button:min-h-9 uv-max480:grid-template-columns-20px-minmax-0-1fr uv-max480:in-text-button:grid-column-2 uv-max480:in-text-button:justify-self-start" role="alert">
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
      <main className="page review-session-shell flex flex-col min-height-calc-100dvh-180px justify-center gap-2.5 in-learning-card:mx-auto in-learning-card:p-4 in-learning-prompt:margin-block-10px-16px in-grade-grid:sticky in-grade-grid:bottom-calc-96px-env-safe-area-inset-bottom in-grade-grid:z-index-4 in-grade-grid:p-1.75 in-grade-grid:border-1px-solid-border-2 in-grade-grid:rounded-uv-r344c386330 in-grade-grid:bg-uv-c54c3fe5d99 in-grade-grid:box-shadow-shadow in-grade-grid:backdrop-filter-blur-14px in-grade-grid-button:min-h-12.5 uv-min620:gap-5.5 uv-min940:gap-6 uv-min940:in-grade-grid:static uv-min940:in-grade-grid:p-0 uv-min940:in-grade-grid:border-0 uv-min940:in-grade-grid:bg-transparent uv-min940:in-grade-grid:box-shadow-none uv-min940:in-grade-grid:backdrop-filter-none">
        <header className="review-session-topbar width-min-100pct-760px margin-0-auto flex items-center justify-between text-uv-text-muted text-uv-ff1713651e0">
          <Link href="/review" className="text-link text-uv-primary-strong font-560 inline-flex items-center gap-1.5">{t("nav.review")}</Link>
          <span>{t("review.remaining", { count: formatNumber(locale, queueData.dueCount) })}</span>
        </header>
        {saveErrorNotice}
        <section className="panel optimistic-next-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c width-min-100pct-760px mx-auto flex flex-col gap-3 in-span-2:text-uv-text-muted in-span-2:text-uv-ff1713651e0" aria-live="polite">
          <div className="skeleton skeleton-kicker rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-22.5 h-3" />
          <div className="skeleton skeleton-title rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-88pct-560px h-13.5" />
          <div className="skeleton skeleton-card bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-28 rounded-uv-r02a0a889dd" />
          <span>{t("review.loadingNext")}</span>
          {queue.isError ? (
            <button
              className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
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
      <main className="page review-session-shell flex flex-col min-height-calc-100dvh-180px justify-center gap-2.5 in-learning-card:mx-auto in-learning-card:p-4 in-learning-prompt:margin-block-10px-16px in-grade-grid:sticky in-grade-grid:bottom-calc-96px-env-safe-area-inset-bottom in-grade-grid:z-index-4 in-grade-grid:p-1.75 in-grade-grid:border-1px-solid-border-2 in-grade-grid:rounded-uv-r344c386330 in-grade-grid:bg-uv-c54c3fe5d99 in-grade-grid:box-shadow-shadow in-grade-grid:backdrop-filter-blur-14px in-grade-grid-button:min-h-12.5 uv-min620:gap-5.5 uv-min940:gap-6 uv-min940:in-grade-grid:static uv-min940:in-grade-grid:p-0 uv-min940:in-grade-grid:border-0 uv-min940:in-grade-grid:bg-transparent uv-min940:in-grade-grid:box-shadow-none uv-min940:in-grade-grid:backdrop-filter-none">
        {saveErrorNotice}
        <section className="empty-state compact-empty flex flex-col gap-3 items-start border-1px-dashed-border-strong rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
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
            <Link href="/review" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">{t("review.back")}</Link>
            <Link href="/practice" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">{t("nav.practice")}</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page review-session-shell flex flex-col min-height-calc-100dvh-180px justify-center gap-2.5 in-learning-card:mx-auto in-learning-card:p-4 in-learning-prompt:margin-block-10px-16px in-grade-grid:sticky in-grade-grid:bottom-calc-96px-env-safe-area-inset-bottom in-grade-grid:z-index-4 in-grade-grid:p-1.75 in-grade-grid:border-1px-solid-border-2 in-grade-grid:rounded-uv-r344c386330 in-grade-grid:bg-uv-c54c3fe5d99 in-grade-grid:box-shadow-shadow in-grade-grid:backdrop-filter-blur-14px in-grade-grid-button:min-h-12.5 uv-min620:gap-5.5 uv-min940:gap-6 uv-min940:in-grade-grid:static uv-min940:in-grade-grid:p-0 uv-min940:in-grade-grid:border-0 uv-min940:in-grade-grid:bg-transparent uv-min940:in-grade-grid:box-shadow-none uv-min940:in-grade-grid:backdrop-filter-none">
      <header className="review-session-topbar width-min-100pct-760px margin-0-auto flex items-center justify-between text-uv-text-muted text-uv-ff1713651e0">
        <Link href="/review" className="text-link text-uv-primary-strong font-560 inline-flex items-center gap-1.5">{t("nav.review")}</Link>
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
