import { connection } from "next/server";
import { TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { formatCompactNumber, formatNumber } from "@/lib/format";
import { getCurrentUser } from "@/lib/current-user";
import { localDateKey } from "@/lib/progress";
import {
  groupUsageBy,
  summarizeUsage,
  type UsageAnalyticsEvent,
} from "@/lib/ai/usage-analytics";

const PERIOD_DAYS: Record<string, number | null> = {
  "7": 7,
  "30": 30,
  "90": 90,
  all: null,
};

function operationLabel(operation: string) {
  return operation
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function periodStart(days: number | null) {
  if (days === null) return null;
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value;
}

function money(value: number | null) {
  if (value === null) return "Unknown";
  if (value === 0) return "$0.00";
  if (value < 0.01) return "$" + value.toFixed(4);
  return "$" + value.toFixed(2);
}

function duration(value: number | null) {
  if (value === null) return "—";
  if (value < 1000) return Math.round(value) + " ms";
  return (value / 1000).toFixed(1) + " s";
}

function percent(value: number) {
  return Math.round(value * 1000) / 10 + "%";
}

function decimal(value: { toString(): string } | null | undefined) {
  return value == null ? null : Number(value.toString());
}

function aggregateCost(input: {
  _sum: { totalCost: { toString(): string } | null };
  _count: { _all: number; totalCost: number };
}) {
  if (input._count._all === 0) return 0;
  if (input._count.totalCost === 0) return null;
  return decimal(input._sum.totalCost);
}

function toAnalyticsEvent(event: {
  operation: string;
  model: string;
  status: "SUCCESS" | "ERROR";
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: { toString(): string } | null;
  durationMs: number | null;
}): UsageAnalyticsEvent {
  return {
    ...event,
    totalCost: decimal(event.totalCost),
  };
}

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    operation?: string;
    model?: string;
    status?: string;
  }>;
}) {
  await connection();
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const period =
    query.period && query.period in PERIOD_DAYS ? query.period : "30";
  const operation = query.operation?.trim() || "";
  const model = query.model?.trim() || "";
  const status =
    query.status === "SUCCESS" || query.status === "ERROR"
      ? query.status
      : "";

  const selectedStart = periodStart(PERIOD_DAYS[period]);
  const sevenDaysAgo = periodStart(7)!;
  const thirtyDaysAgo = periodStart(30)!;
  const now = new Date();
  const todayKey = localDateKey(now, user.timezone);
  const recentForToday = new Date(now.getTime() - 36 * 60 * 60 * 1000);

  const where = {
    userId: user.id,
    ...(selectedStart ? { createdAt: { gte: selectedStart } } : {}),
    ...(operation ? { operation } : {}),
    ...(model ? { model } : {}),
    ...(status ? { status: status as "SUCCESS" | "ERROR" } : {}),
  };

  const [
    todayCost,
    sevenDayCost,
    thirtyDayCost,
    allTimeCost,
    allTimeTokens,
    allTimeRequests,
    allTimeFailures,
    unpricedRequests,
    operations,
    models,
    filteredRows,
    recent,
  ] = await Promise.all([
    db.aiUsageEvent.findMany({
      where: { userId: user.id, createdAt: { gte: recentForToday } },
      select: { totalCost: true, createdAt: true },
    }),
    db.aiUsageEvent.aggregate({
      where: { userId: user.id, createdAt: { gte: sevenDaysAgo } },
      _sum: { totalCost: true },
      _count: { _all: true, totalCost: true },
    }),
    db.aiUsageEvent.aggregate({
      where: { userId: user.id, createdAt: { gte: thirtyDaysAgo } },
      _sum: { totalCost: true },
      _count: { _all: true, totalCost: true },
    }),
    db.aiUsageEvent.aggregate({
      where: { userId: user.id },
      _sum: { totalCost: true },
      _count: { _all: true, totalCost: true },
    }),
    db.aiUsageEvent.aggregate({
      where: { userId: user.id },
      _sum: {
        inputTokens: true,
        cachedInputTokens: true,
        outputTokens: true,
        totalTokens: true,
      },
    }),
    db.aiUsageEvent.count({ where: { userId: user.id } }),
    db.aiUsageEvent.count({
      where: { userId: user.id, status: "ERROR" },
    }),
    db.aiUsageEvent.count({
      where: { userId: user.id, totalCost: null },
    }),
    db.aiUsageEvent.findMany({
      where: { userId: user.id },
      distinct: ["operation"],
      select: { operation: true },
      orderBy: { operation: "asc" },
    }),
    db.aiUsageEvent.findMany({
      where: { userId: user.id },
      distinct: ["model"],
      select: { model: true },
      orderBy: { model: "asc" },
    }),
    db.aiUsageEvent.findMany({
      where,
      select: {
        operation: true,
        model: true,
        status: true,
        inputTokens: true,
        cachedInputTokens: true,
        outputTokens: true,
        totalTokens: true,
        totalCost: true,
        durationMs: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.aiUsageEvent.findMany({
      where,
      select: {
        id: true,
        operation: true,
        model: true,
        status: true,
        inputTokens: true,
        cachedInputTokens: true,
        outputTokens: true,
        reasoningTokens: true,
        totalTokens: true,
        totalCost: true,
        currency: true,
        durationMs: true,
        timeToFirstTokenMs: true,
        pricingKey: true,
        errorCategory: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const todayRows = todayCost.filter(
    (event) => localDateKey(event.createdAt, user.timezone) === todayKey,
  );
  const todayPriced = todayRows
    .map((event) => decimal(event.totalCost))
    .filter((value): value is number => value !== null);
  const todayValue =
    todayRows.length === 0
      ? 0
      : todayPriced.length
        ? todayPriced.reduce((sum, value) => sum + value, 0)
        : null;

  const analyticsRows = filteredRows.map(toAnalyticsEvent);
  const selectedSummary = summarizeUsage(analyticsRows);
  const byOperation = groupUsageBy(analyticsRows, "operation");
  const byModel = groupUsageBy(analyticsRows, "model");

  const chartStart = period === "all" ? thirtyDaysAgo : selectedStart;
  const chartRows = filteredRows.filter(
    (event) => !chartStart || event.createdAt >= chartStart,
  );
  const daily = new Map<string, number>();
  for (const event of chartRows) {
    const cost = decimal(event.totalCost);
    if (cost === null) continue;
    const key = event.createdAt.toISOString().slice(0, 10);
    daily.set(key, (daily.get(key) ?? 0) + cost);
  }
  const chart = Array.from(daily, ([date, cost]) => ({ date, cost }));
  const chartMax = Math.max(0.000001, ...chart.map((item) => item.cost));

  return (
    <main className="page usage-dashboard">
      <section className="page-header compact">
        <p className="eyebrow">AI OPERATIONS</p>
        <h1>Usage & cost</h1>
        <p className="page-description">
          Request-time cost, token, latency, and failure telemetry. Historical
          events created before cost tracking remain visible as unpriced.
        </p>
      </section>

      <section className="usage-cost-grid" aria-label="AI cost summary">
        {[
          ["Today", todayValue],
          ["7 days", aggregateCost(sevenDayCost)],
          ["30 days", aggregateCost(thirtyDayCost)],
          ["All time", aggregateCost(allTimeCost)],
        ].map(([label, value]) => (
          <article className="panel usage-cost-card" key={String(label)}>
            <span>{label}</span>
            <strong>{money(value as number | null)}</strong>
            <small>USD recorded cost</small>
          </article>
        ))}
      </section>

      <section className="usage-summary-grid">
        <article className="panel">
          <span>Requests</span>
          <strong>{formatNumber(allTimeRequests)}</strong>
          <small>
            {allTimeFailures
              ? percent(allTimeFailures / Math.max(1, allTimeRequests)) +
                " failure rate"
              : "No failures"}
          </small>
        </article>
        <article className="panel">
          <span>Total tokens</span>
          <strong>
            {formatCompactNumber(allTimeTokens._sum.totalTokens ?? 0)}
          </strong>
          <small>
            {formatCompactNumber(allTimeTokens._sum.inputTokens ?? 0)} input ·{" "}
            {formatCompactNumber(allTimeTokens._sum.outputTokens ?? 0)} output
          </small>
        </article>
        <article className="panel">
          <span>Cached input</span>
          <strong>
            {formatCompactNumber(allTimeTokens._sum.cachedInputTokens ?? 0)}
          </strong>
          <small>tokens billed at cached-input rates where supported</small>
        </article>
        <article className="panel">
          <span>Unpriced history</span>
          <strong>{formatNumber(unpricedRequests)}</strong>
          <small>requests with unknown or pre-telemetry pricing</small>
        </article>
      </section>

      <form className="usage-filters" method="get">
        <label>
          Period
          <select name="period" defaultValue={period}>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="all">All time</option>
          </select>
        </label>
        <label>
          Feature
          <select name="operation" defaultValue={operation}>
            <option value="">All features</option>
            {operations.map((item) => (
              <option value={item.operation} key={item.operation}>
                {operationLabel(item.operation)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Model
          <select name="model" defaultValue={model}>
            <option value="">All models</option>
            {models.map((item) => (
              <option value={item.model} key={item.model}>
                {item.model}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="ERROR">Error</option>
          </select>
        </label>
        <button className="button button-secondary" type="submit">
          Apply filters
        </button>
      </form>

      <section className="usage-summary-grid">
        <article className="panel">
          <span>Selected requests</span>
          <strong>{formatNumber(selectedSummary.requests)}</strong>
          <small>{percent(selectedSummary.failureRate)} failed</small>
        </article>
        <article className="panel">
          <span>Selected cost</span>
          <strong>{money(selectedSummary.totalCost)}</strong>
          <small>
            {selectedSummary.unpricedRequests
              ? selectedSummary.unpricedRequests + " unpriced"
              : "all priced"}
          </small>
        </article>
        <article className="panel">
          <span>Average request</span>
          <strong>{money(selectedSummary.averageCost)}</strong>
          <small>priced requests only</small>
        </article>
        <article className="panel">
          <span>Average latency</span>
          <strong>{duration(selectedSummary.averageLatencyMs)}</strong>
          <small>provider request duration</small>
        </article>
      </section>

      <section className="panel usage-chart-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">COST OVER TIME</p>
            <h2>{period === "all" ? "Last 30 days" : period + " days"}</h2>
          </div>
        </div>
        {chart.length ? (
          <div className="usage-cost-chart" aria-label="AI cost by day">
            {chart.map((item) => (
              <div className="usage-cost-day" key={item.date}>
                <div className="usage-cost-bar-track">
                  <span
                    className="usage-cost-bar"
                    style={{
                      height:
                        Math.max(3, (item.cost / chartMax) * 100) + "%",
                    }}
                    title={item.date + " · " + money(item.cost)}
                  />
                </div>
                <small>{item.date.slice(5)}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No priced requests in this period.</p>
        )}
      </section>

      <section className="usage-breakdown-grid">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BY FEATURE</p>
              <h2>Operations</h2>
            </div>
          </div>
          <div className="usage-analytics-list">
            {byOperation.map((item) => (
              <div className="usage-analytics-row" key={item.name}>
                <div>
                  <strong>{operationLabel(item.name)}</strong>
                  <span>
                    {item.requests} requests · {percent(item.failureRate)} failed
                  </span>
                </div>
                <div className="usage-analytics-numbers">
                  <strong>{money(item.totalCost)}</strong>
                  <span>
                    {formatCompactNumber(item.inputTokens)} in ·{" "}
                    {formatCompactNumber(item.outputTokens)} out
                  </span>
                  <span>{duration(item.averageLatencyMs)} avg</span>
                </div>
              </div>
            ))}
            {!byOperation.length ? (
              <p className="muted">No usage in this period.</p>
            ) : null}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BY MODEL</p>
              <h2>Models</h2>
            </div>
          </div>
          <div className="usage-analytics-list">
            {byModel.map((item) => (
              <div className="usage-analytics-row" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.requests} requests · {percent(item.failureRate)} failed
                  </span>
                </div>
                <div className="usage-analytics-numbers">
                  <strong>{money(item.totalCost)}</strong>
                  <span>{money(item.averageCost)} avg</span>
                  <span>{duration(item.averageLatencyMs)} avg</span>
                </div>
              </div>
            ))}
            {!byModel.length ? (
              <p className="muted">No model usage in this period.</p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">REQUEST EXPLORER</p>
            <h2>Recent requests</h2>
          </div>
          <span className="muted">{recent.length} shown</span>
        </div>

        <div className="usage-request-list">
          {recent.map((event) => (
            <article className="usage-request-row" key={event.id}>
              <div className="usage-request-main">
                <div>
                  <strong>{operationLabel(event.operation)}</strong>
                  <span>{event.model}</span>
                </div>
                <div className="usage-request-status">
                  {event.status === "ERROR" ? (
                    <TriangleAlert
                      size={15}
                      className="usage-error-icon"
                      aria-label="Failed request"
                    />
                  ) : null}
                  <span>{event.status.toLowerCase()}</span>
                </div>
              </div>
              <div className="usage-request-metrics">
                <span>
                  <b>{formatNumber(event.inputTokens)}</b> input
                </span>
                <span>
                  <b>{formatNumber(event.cachedInputTokens)}</b> cached
                </span>
                <span>
                  <b>{formatNumber(event.outputTokens)}</b> output
                </span>
                <span>
                  <b>{formatNumber(event.reasoningTokens)}</b> reasoning
                </span>
                <span>
                  <b>{formatNumber(event.totalTokens)}</b> total
                </span>
                <span>
                  <b>{duration(event.durationMs)}</b> latency
                </span>
                {event.timeToFirstTokenMs !== null ? (
                  <span>
                    <b>{duration(event.timeToFirstTokenMs)}</b> TTFT
                  </span>
                ) : null}
                <span>
                  <b>{money(decimal(event.totalCost))}</b> cost
                </span>
              </div>
              <div className="usage-request-foot">
                <span>{event.createdAt.toLocaleString()}</span>
                <span>
                  {event.pricingKey ?? "pricing unknown"}
                  {event.errorCategory
                    ? " · " + event.errorCategory.replaceAll("_", " ")
                    : ""}
                </span>
              </div>
            </article>
          ))}
          {!recent.length ? <p className="muted">No requests yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
