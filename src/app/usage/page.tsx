import { BarChart3, Bot, Coins, Cpu, Gauge, TriangleAlert } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { db } from "@/lib/db";
import { formatCompactNumber, formatNumber } from "@/lib/format";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

function operationLabel(operation: string) {
  return operation
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function UsagePage() {
  const user = await getCurrentUser();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    allTime,
    last30Days,
    successfulCalls,
    failedCalls,
    byOperation,
    byModel,
    recent,
  ] = await Promise.all([
    db.aIUsageEvent.aggregate({
      where: { userId: user.id },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      _count: { _all: true },
    }),
    db.aIUsageEvent.aggregate({
      where: { userId: user.id, createdAt: { gte: thirtyDaysAgo } },
      _sum: { totalTokens: true },
      _count: { _all: true },
    }),
    db.aIUsageEvent.count({ where: { userId: user.id, status: "SUCCESS" } }),
    db.aIUsageEvent.count({ where: { userId: user.id, status: "ERROR" } }),
    db.aIUsageEvent.groupBy({
      by: ["operation"],
      where: { userId: user.id },
      _sum: { totalTokens: true, inputTokens: true, outputTokens: true },
      _count: { _all: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    }),
    db.aIUsageEvent.groupBy({
      by: ["model"],
      where: { userId: user.id },
      _sum: { totalTokens: true },
      _count: { _all: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    }),
    db.aIUsageEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const totalTokens = allTime._sum.totalTokens ?? 0;
  const totalCalls = allTime._count._all;
  const maxOperationTokens = Math.max(
    1,
    ...byOperation.map((item) => item._sum.totalTokens ?? 0),
  );

  return (
    <main className="page">
      <section className="page-header">
        <p className="eyebrow">OPENAI USAGE</p>
        <h1>Usage</h1>
        <p className="page-description">
          Token counts are recorded from OpenAI response metadata and persisted
          in Neon for every implemented AI operation.
        </p>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Total tokens"
          value={formatCompactNumber(totalTokens)}
          detail={formatNumber(totalTokens) + " all time"}
        />
        <StatCard
          label="Input tokens"
          value={formatCompactNumber(allTime._sum.inputTokens ?? 0)}
        />
        <StatCard
          label="Output tokens"
          value={formatCompactNumber(allTime._sum.outputTokens ?? 0)}
        />
        <StatCard
          label="AI requests"
          value={formatNumber(totalCalls)}
          detail={successfulCalls + " successful · " + failedCalls + " failed"}
        />
      </section>

      <section className="usage-grid">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LAST 30 DAYS</p>
              <h2>Recent volume</h2>
            </div>
            <Gauge size={20} />
          </div>
          <p className="usage-hero-number">
            {formatCompactNumber(last30Days._sum.totalTokens ?? 0)}
          </p>
          <p className="muted">
            {formatNumber(last30Days._count._all)} OpenAI requests
          </p>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OPERATIONS</p>
              <h2>Where tokens go</h2>
            </div>
            <BarChart3 size={20} />
          </div>
          {byOperation.length ? (
            byOperation.map((item) => {
              const tokens = item._sum.totalTokens ?? 0;
              return (
                <div className="usage-breakdown" key={item.operation}>
                  <div className="usage-row">
                    <div className="usage-name">
                      <strong>{operationLabel(item.operation)}</strong>
                      <span>{item._count._all} requests</span>
                    </div>
                    <span className="usage-number">{formatNumber(tokens)}</span>
                  </div>
                  <div className="metric-bar" aria-hidden="true">
                    <span style={{ width: Math.max(3, (tokens / maxOperationTokens) * 100) + "%" }} />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="muted">No AI usage has been recorded yet.</p>
          )}
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">MODELS</p>
              <h2>Model distribution</h2>
            </div>
            <Cpu size={20} />
          </div>
          {byModel.length ? (
            byModel.map((item) => (
              <div className="usage-row" key={item.model}>
                <div className="usage-name">
                  <strong>{item.model}</strong>
                  <span>{item._count._all} requests</span>
                </div>
                <span className="usage-number">
                  {formatNumber(item._sum.totalTokens ?? 0)}
                </span>
              </div>
            ))
          ) : (
            <p className="muted">No model usage yet.</p>
          )}
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HISTORY</p>
            <h2>Recent AI requests</h2>
          </div>
          <Bot size={20} />
        </div>

        {recent.length ? (
          recent.map((event) => (
            <div className="usage-row" key={event.id}>
              <div className="usage-name">
                <strong>{operationLabel(event.operation)}</strong>
                <span>
                  {event.model} · {event.createdAt.toLocaleString()}
                </span>
              </div>
              <div className="usage-event-number">
                <span className="usage-number">
                  {formatNumber(event.totalTokens)} tokens
                </span>
                {event.status === "ERROR" ? (
                  <TriangleAlert size={15} className="usage-error-icon" />
                ) : (
                  <Coins size={15} />
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Bot size={22} />
            <strong>No AI usage yet</strong>
            <span>
              Analyze vocabulary or submit an AI-evaluated exercise to start
              collecting token metrics.
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
