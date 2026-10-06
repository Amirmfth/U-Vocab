export type ProgressRange = "7" | "30" | "90" | "365" | "all";

export const PROGRESS_RANGE_DAYS: Record<ProgressRange, number | null> = {
  "7": 7,
  "30": 30,
  "90": 90,
  "365": 365,
  all: null,
};

export function isProgressRange(value: string | undefined): value is ProgressRange {
  return Boolean(value && value in PROGRESS_RANGE_DAYS);
}

export function resolveProgressRange(
  requested: string | undefined,
  canUseLongHistory: boolean,
): ProgressRange {
  const normalized = isProgressRange(requested) ? requested : canUseLongHistory ? "30" : "7";
  if (!canUseLongHistory && normalized !== "7") return "7";
  return normalized;
}

export function rangeCutoff(range: ProgressRange, now = new Date()) {
  const days = PROGRESS_RANGE_DAYS[range];
  if (days === null) return null;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function previousPeriod(
  range: ProgressRange,
  now = new Date(),
): { start: Date; end: Date } | null {
  const days = PROGRESS_RANGE_DAYS[range];
  if (days === null) return null;
  const end = rangeCutoff(range, now);
  if (!end) return null;
  return {
    start: new Date(end.getTime() - days * 24 * 60 * 60 * 1000),
    end,
  };
}

export type MetricComparison = {
  current: number;
  previous: number;
  delta: number;
  relative: number | null;
};

export function compareMetric(current: number, previous: number): MetricComparison {
  return {
    current,
    previous,
    delta: current - previous,
    relative: previous === 0 ? null : (current - previous) / previous,
  };
}

export function learningReport(input: {
  recognition: number;
  production: number;
  retention: number;
  dueNow: number;
  topWeakness?: string | null;
  masteredDelta?: number | null;
}) {
  const strengths = [
    { key: "recognition" as const, value: input.recognition },
    { key: "production" as const, value: input.production },
    { key: "retention" as const, value: input.retention },
  ].sort((a, b) => b.value - a.value);

  const strongest = strengths[0]?.key ?? "recognition";
  const productionGap = input.recognition - input.production;

  const highestImpactWeakness =
    input.topWeakness ??
    (productionGap >= 0.15 ? "production" : input.dueNow > 0 ? "reviews" : "none");

  const recentImprovement =
    (input.masteredDelta ?? 0) > 0 ? "mastery" : strengths[0]?.value >= 0.75 ? strongest : "steady";

  const suggestedNext =
    input.topWeakness ??
    (input.dueNow > 0 ? "reviews" : productionGap >= 0.15 ? "production" : "practice");

  return {
    strongest,
    highestImpactWeakness,
    recentImprovement,
    suggestedNext,
  };
}
