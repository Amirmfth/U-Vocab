"use client";

import Link from "next/link";
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

async function fetchReviewQueue(): Promise<ReviewQueueData> {
  const response = await fetch("/api/review/queue", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

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

  const queue = useQuery({
    queryKey: queueKey,
    queryFn: fetchReviewQueue,
    initialData,
    ...REVIEW_QUEUE_QUERY_POLICY,
  });

  const review = useMutation({
    mutationFn: async (input: ReviewMutationInput) => {
      const result = await submitReviewMutation(input);
      if (result.status === "error") throw new Error(result.message);
      return result;
    },
    onMutate: async (input) => {
      const perf = startOperation("interaction.review_rating", {
        grade: input.grade,
        optimistic: true,
      });
      await queryClient.cancelQueries({ queryKey: queueKey });
      const previous = queryClient.getQueryData<ReviewQueueData>(queueKey);

      queryClient.setQueryData<ReviewQueueData>(queueKey, (current) =>
        current
          ? optimisticReviewAdvance(current, input.userVocabularyId)
          : current,
      );

      return { previous, perf };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queueKey, context.previous);
      }
      context?.perf.fail(error, { rolledBack: true });
    },
    onSuccess: async (_result, _input, context) => {
      context?.perf.success({ rolledBack: false });
      const current = queryClient.getQueryData<ReviewQueueData>(queueKey);
      if (!current || shouldRefillReviewQueue(current)) {
        await queryClient.invalidateQueries({ queryKey: queueKey });
      }
    },
  });

  const queueData = queue.data ?? initialData;
  const card = queueData.cards[0];

  function grade(grade: ReviewGrade, startedAt: number) {
    if (!card || review.isPending) return;
    review.mutate({
      userVocabularyId: card.userVocabularyId,
      grade,
      exerciseType: card.exercise.type,
      prompt: card.exercise.prompt,
      startedAt,
    });
  }

  if (!card && (review.isPending || queue.isFetching)) {
    return (
      <main className="page review-session-shell">
        <header className="review-session-topbar">
          <Link href="/review" className="text-link">Review</Link>
          <span>{queueData.dueCount} remaining</span>
        </header>
        <section className="panel optimistic-next-card" aria-live="polite">
          <div className="skeleton skeleton-kicker" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-card" />
          <span>Loading the next review…</span>
        </section>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="page review-session-shell">
        <section className="empty-state compact-empty">
          <strong>Review complete</strong>
          <span className="muted">Nothing else is due right now.</span>
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
          {review.isPending ? "Saving previous review…" : queueData.dueCount + " remaining"}
        </span>
      </header>

      {review.isError ? (
        <div className="optimistic-error" role="alert">
          <AlertCircle size={17} />
          <span>
            {review.error instanceof Error
              ? review.error.message
              : "Could not save the review."}
          </span>
          <button
            className="text-button"
            onClick={() => {
              if (review.variables) review.mutate(review.variables);
            }}
            type="button"
          >
            <RotateCcw size={15} />
            Retry
          </button>
        </div>
      ) : null}

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
            isSubmitting={review.isPending}
            onGrade={grade}
          />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
