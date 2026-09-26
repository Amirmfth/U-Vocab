"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RotateCcw } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { startOperation } from "@/lib/performance";
import { optimisticReviewAdvance, REVIEW_QUEUE_QUERY_POLICY, shouldRefillReviewQueue } from "@/lib/review-query";
import type { ReviewGrade } from "@/lib/fsrs";
import type { ReviewQueueData } from "@/lib/review-queue";
import {
  submitReviewMutation,
  type ReviewMutationInput,
} from "./actions";
import { ReviewCard } from "./ReviewCard";

async function fetchReviewQueue(excludeIds: ReadonlySet<string>): Promise<ReviewQueueData> {
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
  if (!response.ok) {
    throw new Error("Could not refresh the review queue.");
  }

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
  const queueKey = queryKeys.review.queue(userScope);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, again: 0 });
  const answeredIds = useRef(new Set<string>());
  const unsavedIds = useRef(new Set<string>());
  const [pendingCount, setPendingCount] = useState(0);
  const [saveErrors, setSaveErrors] = useState<Map<string, { input: ReviewMutationInput; message: string }>>(new Map());

  const queue = useQuery({
    queryKey: queueKey,
    queryFn: async () => {
      const data = await fetchReviewQueue(unsavedIds.current);
      return {
        ...data,
        cards: data.cards.filter((item) => !answeredIds.current.has(item.userVocabularyId)),
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
      setSaveErrors((errors) => new Map(errors).set(input.userVocabularyId, {
        input,
        message: error instanceof Error ? error.message : "Could not save the review.",
      }));
      context?.perf.fail(error, { rolledBack: false });
    },
    onSuccess: (_result, input, context) => {
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
      if (!current || shouldRefillReviewQueue(current) || current.cards.length === 0) {
        void queryClient.invalidateQueries({ queryKey: queueKey });
      }
    },
  });

  const queueData = queue.data ?? initialData;
  const card = queueData.cards[0];
  const saveErrorNotice = saveErrors.size > 0 ? (
    <div className="optimistic-error" role="alert">
      <AlertCircle size={17} />
      <span>
        {saveErrors.size} review{saveErrors.size === 1 ? "" : "s"} could not be saved. {saveErrors.values().next().value?.message}
      </span>
      <button
        className="text-button"
        onClick={() => {
          for (const { input } of saveErrors.values()) review.mutate(input);
        }}
        type="button"
      >
        <RotateCcw size={15} />
        Retry
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
      <main className="page review-session-shell">
        <header className="review-session-topbar">
          <Link href="/review" className="text-link">Review</Link>
          <span>{queueData.dueCount} remaining</span>
        </header>
        {saveErrorNotice}
        <section className="panel optimistic-next-card" aria-live="polite">
          <div className="skeleton skeleton-kicker" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-card" />
          <span>Loading the next review…</span>
          {queue.isError ? <button className="button button-secondary" type="button" onClick={() => void queue.refetch()}>Retry loading</button> : null}
        </section>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="page review-session-shell">
        {saveErrorNotice}
        <section className="empty-state compact-empty">
          <strong>{saveErrors.size > 0 ? "Reviews need saving" : "Review complete"}</strong>
          <span className="muted">
            {sessionStats.reviewed} reviewed · {sessionStats.again} marked Again
          </span>
          <div className="ia-empty-actions">
            <Link href="/review" className="button button-primary">Back to Review</Link>
            <Link href="/practice" className="button button-secondary">Practice</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page review-session-shell">
      <header className="review-session-topbar">
        <Link href="/review" className="text-link">Review</Link>
        <span>
          {queueData.dueCount} remaining{pendingCount > 0 ? ` · ${pendingCount} saving` : ""}
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
          <ReviewCard
            card={card}
            onGrade={grade}
          />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
