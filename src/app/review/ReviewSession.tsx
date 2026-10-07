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
      <div className="optimistic-error [width:min(100%,_760px)] [margin-inline:auto] [display:grid] [grid-template-columns:20px_minmax(0,_1fr)_auto] [align-items:center] [gap:9px] [padding:10px_12px] [border:1px_solid_rgba(239,_91,_91,_0.35)] [border-radius:13px] [background:rgba(239,_91,_91,_0.08)] [color:var(--text-soft)] [font-size:0.74rem] [&_>_svg]:[color:var(--danger)] [&_.text-button]:[min-height:36px] max-[480px]:[grid-template-columns:20px_minmax(0,_1fr)] max-[480px]:[&_.text-button]:[grid-column:2] max-[480px]:[&_.text-button]:[justify-self:start]" role="alert">
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
          className="text-button [min-height:38px] [display:inline-flex] [align-items:center] [gap:6px] [border:0] [background:transparent] [color:var(--text-muted)] [cursor:pointer]"
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
      <main className="page review-session-shell [display:flex] [flex-direction:column] [min-height:calc(100dvh_-_180px)] [justify-content:center] [gap:10px] [&_.learning-card]:[margin-inline:auto] [&_.learning-card]:[padding:16px] [&_.learning-prompt]:[margin-block:10px_16px] [&_.grade-grid]:[position:sticky] [&_.grade-grid]:[bottom:calc(96px_+_env(safe-area-inset-bottom))] [&_.grade-grid]:[z-index:4] [&_.grade-grid]:[padding:7px] [&_.grade-grid]:[border:1px_solid_var(--border)] [&_.grade-grid]:[border-radius:15px] [&_.grade-grid]:[background:rgba(17,_17,_20,_0.94)] [&_.grade-grid]:[box-shadow:var(--shadow)] [&_.grade-grid]:[backdrop-filter:blur(14px)] [&_.grade-grid_.button]:[min-height:50px] min-[620px]:[gap:22px] min-[940px]:[gap:24px] min-[940px]:[&_.grade-grid]:[position:static] min-[940px]:[&_.grade-grid]:[padding:0] min-[940px]:[&_.grade-grid]:[border:0] min-[940px]:[&_.grade-grid]:[background:transparent] min-[940px]:[&_.grade-grid]:[box-shadow:none] min-[940px]:[&_.grade-grid]:[backdrop-filter:none]">
        <header className="review-session-topbar [width:min(100%,_760px)] [margin:0_auto] [display:flex] [align-items:center] [justify-content:space-between] [color:var(--text-muted)] [font-size:0.72rem]">
          <Link href="/review" className="text-link [color:var(--primary-strong)] [font-weight:560] [display:inline-flex] [align-items:center] [gap:6px]">{t("nav.review")}</Link>
          <span>{t("review.remaining", { count: formatNumber(locale, queueData.dueCount) })}</span>
        </header>
        {saveErrorNotice}
        <section className="panel optimistic-next-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [width:min(100%,_760px)] [margin-inline:auto] [display:flex] [flex-direction:column] [gap:12px] [&_>_span]:[color:var(--text-muted)] [&_>_span]:[font-size:0.72rem]" aria-live="polite">
          <div className="skeleton skeleton-kicker [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:90px] [height:12px]" />
          <div className="skeleton skeleton-title [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(88%,_560px)] [height:54px]" />
          <div className="skeleton skeleton-card [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [height:112px] [border-radius:var(--radius-lg)]" />
          <span>{t("review.loadingNext")}</span>
          {queue.isError ? (
            <button
              className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
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
      <main className="page review-session-shell [display:flex] [flex-direction:column] [min-height:calc(100dvh_-_180px)] [justify-content:center] [gap:10px] [&_.learning-card]:[margin-inline:auto] [&_.learning-card]:[padding:16px] [&_.learning-prompt]:[margin-block:10px_16px] [&_.grade-grid]:[position:sticky] [&_.grade-grid]:[bottom:calc(96px_+_env(safe-area-inset-bottom))] [&_.grade-grid]:[z-index:4] [&_.grade-grid]:[padding:7px] [&_.grade-grid]:[border:1px_solid_var(--border)] [&_.grade-grid]:[border-radius:15px] [&_.grade-grid]:[background:rgba(17,_17,_20,_0.94)] [&_.grade-grid]:[box-shadow:var(--shadow)] [&_.grade-grid]:[backdrop-filter:blur(14px)] [&_.grade-grid_.button]:[min-height:50px] min-[620px]:[gap:22px] min-[940px]:[gap:24px] min-[940px]:[&_.grade-grid]:[position:static] min-[940px]:[&_.grade-grid]:[padding:0] min-[940px]:[&_.grade-grid]:[border:0] min-[940px]:[&_.grade-grid]:[background:transparent] min-[940px]:[&_.grade-grid]:[box-shadow:none] min-[940px]:[&_.grade-grid]:[backdrop-filter:none]">
        {saveErrorNotice}
        <section className="empty-state compact-empty [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [border:1px_dashed_var(--border-strong)] [border-radius:var(--radius-lg)] [color:var(--text-soft)] [padding:17px]">
          <strong>
            {saveErrors.size > 0 ? t("review.needSaving") : t("review.complete")}
          </strong>
          <span className="muted [color:var(--text-muted)]">
            {t("review.sessionStats", {
              reviewed: formatNumber(locale, sessionStats.reviewed),
              again: formatNumber(locale, sessionStats.again),
            })}
          </span>
          <div className="ia-empty-actions [display:flex] [flex-direction:column] [gap:8px] min-[620px]:[flex-direction:row] min-[620px]:[align-items:center]">
            <Link href="/review" className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">{t("review.back")}</Link>
            <Link href="/practice" className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">{t("nav.practice")}</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page review-session-shell [display:flex] [flex-direction:column] [min-height:calc(100dvh_-_180px)] [justify-content:center] [gap:10px] [&_.learning-card]:[margin-inline:auto] [&_.learning-card]:[padding:16px] [&_.learning-prompt]:[margin-block:10px_16px] [&_.grade-grid]:[position:sticky] [&_.grade-grid]:[bottom:calc(96px_+_env(safe-area-inset-bottom))] [&_.grade-grid]:[z-index:4] [&_.grade-grid]:[padding:7px] [&_.grade-grid]:[border:1px_solid_var(--border)] [&_.grade-grid]:[border-radius:15px] [&_.grade-grid]:[background:rgba(17,_17,_20,_0.94)] [&_.grade-grid]:[box-shadow:var(--shadow)] [&_.grade-grid]:[backdrop-filter:blur(14px)] [&_.grade-grid_.button]:[min-height:50px] min-[620px]:[gap:22px] min-[940px]:[gap:24px] min-[940px]:[&_.grade-grid]:[position:static] min-[940px]:[&_.grade-grid]:[padding:0] min-[940px]:[&_.grade-grid]:[border:0] min-[940px]:[&_.grade-grid]:[background:transparent] min-[940px]:[&_.grade-grid]:[box-shadow:none] min-[940px]:[&_.grade-grid]:[backdrop-filter:none]">
      <header className="review-session-topbar [width:min(100%,_760px)] [margin:0_auto] [display:flex] [align-items:center] [justify-content:space-between] [color:var(--text-muted)] [font-size:0.72rem]">
        <Link href="/review" className="text-link [color:var(--primary-strong)] [font-weight:560] [display:inline-flex] [align-items:center] [gap:6px]">{t("nav.review")}</Link>
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
