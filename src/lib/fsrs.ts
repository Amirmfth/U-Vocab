import type { Prisma } from "@prisma/client";
import {
  createEmptyCard,
  fsrs,
  Rating,
  type Card,
  type Grade,
} from "ts-fsrs";

export type ReviewGrade = "AGAIN" | "HARD" | "GOOD" | "EASY";

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: true,
  enable_short_term: true,
});

const ratingMap: Record<ReviewGrade, Grade> = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
};

function hydrateCard(value: unknown, now: Date): Card {
  if (!value || typeof value !== "object") return createEmptyCard(now);
  const raw = value as Record<string, unknown>;
  return {
    ...(raw as unknown as Card),
    due: new Date(String(raw.due)),
    last_review: raw.last_review ? new Date(String(raw.last_review)) : undefined,
  };
}

function jsonCard(card: Card): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(card)) as Prisma.InputJsonValue;
}

export function currentRetrievability(savedCard: unknown, now = new Date()) {
  const card = hydrateCard(savedCard, now);
  return scheduler.get_retrievability(card, now, false);
}

export function scheduleReview(
  savedCard: unknown,
  grade: ReviewGrade,
  now = new Date(),
) {
  const previous = hydrateCard(savedCard, now);
  const result = scheduler.next(previous, now, ratingMap[grade]);
  const retrievability = scheduler.get_retrievability(result.card, now, false);

  return {
    previousCard: jsonCard(previous),
    nextCard: jsonCard(result.card),
    due: result.card.due,
    stability: result.card.stability,
    difficulty: result.card.difficulty,
    retrievability,
  };
}


export function isReviewDue(nextReviewAt: Date | null | undefined, now = new Date()) {
  return !nextReviewAt || nextReviewAt.getTime() <= now.getTime();
}
