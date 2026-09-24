export type UsageAnalyticsEvent = {
  operation: string;
  model: string;
  status: "SUCCESS" | "ERROR";
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number | null;
  durationMs: number | null;
};

export function summarizeUsage(events: UsageAnalyticsEvent[]) {
  const requests = events.length;
  const failures = events.filter((event) => event.status === "ERROR").length;
  const priced = events.filter((event) => event.totalCost !== null);
  const totalCost = priced.reduce(
    (sum, event) => sum + (event.totalCost ?? 0),
    0,
  );
  const durations = events
    .map((event) => event.durationMs)
    .filter((value): value is number => value !== null);

  return {
    requests,
    failures,
    failureRate: requests ? failures / requests : 0,
    inputTokens: events.reduce((sum, event) => sum + event.inputTokens, 0),
    cachedInputTokens: events.reduce(
      (sum, event) => sum + event.cachedInputTokens,
      0,
    ),
    outputTokens: events.reduce((sum, event) => sum + event.outputTokens, 0),
    totalTokens: events.reduce((sum, event) => sum + event.totalTokens, 0),
    totalCost: priced.length ? totalCost : null,
    unpricedRequests: requests - priced.length,
    averageCost: priced.length ? totalCost / priced.length : null,
    averageLatencyMs: durations.length
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length
      : null,
  };
}

export function groupUsageBy(
  events: UsageAnalyticsEvent[],
  key: "operation" | "model",
) {
  const groups = new Map<string, UsageAnalyticsEvent[]>();
  for (const event of events) {
    groups.set(event[key], [...(groups.get(event[key]) ?? []), event]);
  }

  return Array.from(groups, ([name, grouped]) => ({
    name,
    ...summarizeUsage(grouped),
  })).sort((a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0));
}
