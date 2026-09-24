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

function jsonCard(card: Card) {
  return JSON.parse(JSON.stringify(card)) as Record<string, unknown>;
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
