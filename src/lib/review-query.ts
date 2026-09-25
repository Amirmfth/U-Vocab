import type { ReviewQueueData } from "./review-queue";

export const REVIEW_QUEUE_STALE_TIME = 30_000;

export const REVIEW_QUEUE_QUERY_POLICY = {
  staleTime: REVIEW_QUEUE_STALE_TIME,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
};

export function optimisticReviewAdvance(
  queue: ReviewQueueData,
  userVocabularyId: string,
): ReviewQueueData {
  return {
    dueCount: Math.max(0, queue.dueCount - 1),
    cards: queue.cards.filter(
      (card) => card.userVocabularyId !== userVocabularyId,
    ),
  };
}
