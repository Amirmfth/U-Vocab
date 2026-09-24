import type { ExerciseType } from "@prisma/client";
import { currentRetrievability } from "@/lib/fsrs";

export type ActivityDay = {
  date: string;
  reviewed: number;
  learned: number;
  produced: number;
  readingEncounters: number;
  mistakesCorrected: number;
  durationMs: number;
};

export function localDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return values.year + "-" + values.month + "-" + values.day;
}

export function buildActivityDays(input: {
  timeZone: string;
  attempts: Array<{ createdAt: Date; exerciseType: ExerciseType; durationMs: number | null }>;
  reviews: Array<{ reviewedAt: Date }>;
  encounters: Array<{ createdAt: Date; source: string }>;
  vocabulary: Array<{ addedAt: Date }>;
  mistakes: Array<{ resolvedAt: Date | null }>;
}) {
  const days = new Map<string, ActivityDay>();

  const day = (date: Date) => {
    const key = localDateKey(date, input.timeZone);
    const existing = days.get(key);
    if (existing) return existing;
    const created: ActivityDay = {
      date: key,
      reviewed: 0,
      learned: 0,
      produced: 0,
      readingEncounters: 0,
      mistakesCorrected: 0,
      durationMs: 0,
    };
    days.set(key, created);
    return created;
  };

  for (const review of input.reviews) day(review.reviewedAt).reviewed += 1;
  for (const item of input.vocabulary) day(item.addedAt).learned += 1;
  for (const encounter of input.encounters) {
    if (encounter.source === "reading" || encounter.source === "story") {
      day(encounter.createdAt).readingEncounters += 1;
    }
  }
  for (const mistake of input.mistakes) {
    if (mistake.resolvedAt) day(mistake.resolvedAt).mistakesCorrected += 1;
  }

  const productionTypes = new Set<ExerciseType>([
    "FREE_SENTENCE",
    "PARAPHRASE",
    "COLLOCATION",
    "CASE_PREPOSITION",
    "CONTEXTUAL_CHOICE",
  ]);

  for (const attempt of input.attempts) {
    const target = day(attempt.createdAt);
    target.durationMs += attempt.durationMs ?? 0;
    if (productionTypes.has(attempt.exerciseType)) target.produced += 1;
  }

  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function rescueRisk(input: {
  fsrsCard: unknown;
  nextReviewAt: Date | null;
  stability: number | null;
  recentFailures: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const retrievability = currentRetrievability(input.fsrsCard, now);
  const overdue =
    input.nextReviewAt && input.nextReviewAt.getTime() < now.getTime() ? 1 : 0;
  const lowStability = Math.max(0, 1 - Math.min((input.stability ?? 0) / 30, 1));

  const score = Math.min(
    1,
    (1 - retrievability) * 0.55 +
      overdue * 0.12 +
      Math.min(input.recentFailures, 3) * 0.08 +
      lowStability * 0.09,
  );

  const reasons: string[] = [];
  if (retrievability < 0.8) reasons.push("low FSRS retrievability");
  if (overdue) reasons.push("review is overdue");
  if (input.recentFailures > 0) {
    reasons.push(
      input.recentFailures === 1
        ? "1 recent failed retrieval"
        : input.recentFailures + " recent failed retrievals",
    );
  }
  if ((input.stability ?? 0) < 7) reasons.push("low stability");

  return { score, retrievability, reasons };
}
