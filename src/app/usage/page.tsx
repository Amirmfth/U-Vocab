import { TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { formatCompactNumber, formatNumber } from "@/lib/format";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

function operationLabel(operation: string) {
  return operation.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export default async function UsagePage() {
  const user = await getCurrentUser();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [allTime, last30Days, failedCalls, byOperation, recent] = await Promise.all([
    db.aiUsageEvent.aggregate({
      where: { userId: user.id },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      _count: { _all: true },
    }),
    db.aiUsageEvent.aggregate({
      where: { userId: user.id, createdAt: { gte: thirtyDaysAgo } },
      _sum: { totalTokens: true }, _count: { _all: true },
    }),
    db.aiUsageEvent.count({ where: { userId: user.id, status: "ERROR" } }),
    db.aiUsageEvent.groupBy({
      by: ["operation"], where: { userId: user.id },
      _sum: { totalTokens: true }, _count: { _all: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    }),
    db.aiUsageEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  return (
    <main className="page">
      <section className="page-header compact"><h1>Usage</h1></section>

      <section className="usage-summary">
        <div><span>30 days</span><strong>{formatCompactNumber(last30Days._sum.totalTokens ?? 0)}</strong><small>tokens</small></div>
        <div><span>All time</span><strong>{formatCompactNumber(allTime._sum.totalTokens ?? 0)}</strong><small>tokens</small></div>
        <div><span>Requests</span><strong>{formatNumber(allTime._count._all)}</strong><small>{failedCalls ? failedCalls + " failed" : "no failures"}</small></div>
      </section>

      <section className="usage-section">
        <h2>By feature</h2>
        <div className="usage-list">
          {byOperation.map((item) => (
            <div className="usage-row" key={item.operation}>
              <div className="usage-name"><strong>{operationLabel(item.operation)}</strong><span>{item._count._all} requests</span></div>
              <span className="usage-number">{formatNumber(item._sum.totalTokens ?? 0)}</span>
            </div>
          ))}
          {!byOperation.length ? <p className="muted">No usage yet</p> : null}
        </div>
      </section>

      <section className="usage-section">
        <h2>Recent</h2>
        <div className="usage-list">
          {recent.map((event) => (
            <div className="usage-row" key={event.id}>
              <div className="usage-name"><strong>{operationLabel(event.operation)}</strong><span>{event.createdAt.toLocaleString()}</span></div>
              <div className="usage-event-number">
                <span className="usage-number">{formatNumber(event.totalTokens)}</span>
                {event.status === "ERROR" ? <TriangleAlert size={15} className="usage-error-icon" aria-label="Failed request" /> : null}
              </div>
            </div>
          ))}
          {!recent.length ? <p className="muted">No requests yet</p> : null}
        </div>
      </section>
    </main>
  );
}
