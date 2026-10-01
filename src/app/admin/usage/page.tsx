import Link from "next/link";
import { AIUsageStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

const PAGE_SIZE = 40;
function decimal(value: Prisma.Decimal | null | undefined) {
  return value == null ? null : Number(value.toString());
}
function money(value: Prisma.Decimal | number | null | undefined) {
  const n = typeof value === "number" ? value : decimal(value);
  return n === null ? "unpriced" : "$" + n.toFixed(5);
}
function dateParam(value: string | undefined, end = false) {
  if (!value) return null;
  const date = new Date(value + (end ? "T23:59:59.999Z" : "T00:00:00.000Z"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; course?: string; operation?: string; model?: string; status?: string; from?: string; to?: string; page?: string }>;
}) {
  await requireAdmin();
  const q = await searchParams;
  const page = Math.max(1, Number.parseInt(q.page ?? "1", 10) || 1);
  const from = dateParam(q.from);
  const to = dateParam(q.to, true);
  const where: Prisma.AiUsageEventWhereInput = {
    ...(q.user ? { userId: q.user } : {}),
    ...(q.course ? { userCourseId: q.course } : {}),
    ...(q.operation ? { operation: q.operation } : {}),
    ...(q.model ? { model: q.model } : {}),
    ...(q.status === "SUCCESS" || q.status === "ERROR" ? { status: q.status as AIUsageStatus } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [total, totals, failures, recent, operations, models, byOperation, byModel, topUsers, unpriced] = await Promise.all([
    db.aiUsageEvent.count({ where }),
    db.aiUsageEvent.aggregate({ where, _sum: { totalCost: true, inputTokens: true, cachedInputTokens: true, outputTokens: true, reasoningTokens: true, totalTokens: true, durationMs: true, timeToFirstTokenMs: true }, _count: { _all: true } }),
    db.aiUsageEvent.count({ where: { AND: [where, { status: "ERROR" }] } }),
    db.aiUsageEvent.findMany({
      where,
      select: { id: true, userId: true, userCourseId: true, operation: true, provider: true, model: true, status: true, inputTokens: true, cachedInputTokens: true, outputTokens: true, reasoningTokens: true, totalTokens: true, totalCost: true, durationMs: true, timeToFirstTokenMs: true, pricingKey: true, errorCategory: true, createdAt: true, user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.aiUsageEvent.findMany({ distinct: ["operation"], select: { operation: true }, orderBy: { operation: "asc" }, take: 200 }),
    db.aiUsageEvent.findMany({ distinct: ["model"], select: { model: true }, orderBy: { model: "asc" }, take: 100 }),
    db.aiUsageEvent.groupBy({ by: ["operation"], where, _count: { _all: true }, _sum: { totalCost: true, totalTokens: true, durationMs: true }, orderBy: { _sum: { totalCost: "desc" } }, take: 20 }),
    db.aiUsageEvent.groupBy({ by: ["model"], where, _count: { _all: true }, _sum: { totalCost: true, totalTokens: true, durationMs: true }, orderBy: { _sum: { totalCost: "desc" } }, take: 20 }),
    db.aiUsageEvent.groupBy({ by: ["userId"], where, _count: { _all: true }, _sum: { totalCost: true, totalTokens: true }, orderBy: { _sum: { totalCost: "desc" } }, take: 15 }),
    db.aiUsageEvent.count({ where: { AND: [where, { totalCost: null }] } }),
  ]);
  const topUserRecords = await db.user.findMany({ where: { id: { in: topUsers.map((x) => x.userId) } }, select: { id: true, email: true } });
  const emails = new Map(topUserRecords.map((x) => [x.id, x.email]));
  const avgCost = total && totals._sum.totalCost ? Number(totals._sum.totalCost) / Math.max(1, total - unpriced) : null;
  const avgLatency = total && totals._sum.durationMs ? totals._sum.durationMs / total : null;
  const avgTtft = total && totals._sum.timeToFirstTokenMs ? totals._sum.timeToFirstTokenMs / total : null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <main className="page admin-page">
    <section className="page-header compact"><p className="eyebrow">AI OPERATIONS</p><h1>AI usage & cost</h1><p className="page-description">Authoritative database telemetry from AiUsageEvent. No prompt or learner-content payloads are shown.</p></section>
    <form className="panel admin-filter-bar" method="get">
      <input name="user" defaultValue={q.user} placeholder="User ID" />
      <input name="course" defaultValue={q.course} placeholder="Course ID" />
      <select name="operation" defaultValue={q.operation ?? ""}><option value="">All operations</option>{operations.map((o) => <option key={o.operation}>{o.operation}</option>)}</select>
      <select name="model" defaultValue={q.model ?? ""}><option value="">All models</option>{models.map((m) => <option key={m.model}>{m.model}</option>)}</select>
      <select name="status" defaultValue={q.status ?? ""}><option value="">All statuses</option><option>SUCCESS</option><option>ERROR</option></select>
      <input type="date" name="from" defaultValue={q.from ?? ""}/><input type="date" name="to" defaultValue={q.to ?? ""}/>
      <button className="button button-primary">Filter</button>
    </form>
    <section className="admin-metric-grid">
      <article className="panel admin-metric"><span>Total cost</span><strong>{money(totals._sum.totalCost)}</strong><small>{unpriced} unpriced events</small></article>
      <article className="panel admin-metric"><span>Requests</span><strong>{total.toLocaleString()}</strong><small>{total ? ((failures/total)*100).toFixed(2) : "0"}% failed</small></article>
      <article className="panel admin-metric"><span>Tokens</span><strong>{(totals._sum.totalTokens ?? 0).toLocaleString()}</strong><small>{(totals._sum.cachedInputTokens ?? 0).toLocaleString()} cached input</small></article>
      <article className="panel admin-metric"><span>Average cost</span><strong>{money(avgCost)}</strong><small>priced requests only</small></article>
      <article className="panel admin-metric"><span>Average latency</span><strong>{avgLatency ? Math.round(avgLatency)+" ms" : "—"}</strong><small>provider duration</small></article>
      <article className="panel admin-metric"><span>Average TTFT</span><strong>{avgTtft ? Math.round(avgTtft)+" ms" : "—"}</strong><small>where recorded</small></article>
    </section>
    <section className="admin-three-column">
      <article className="panel"><h2>By feature</h2><div className="admin-table-list">{byOperation.map((x) => <div key={x.operation}><strong>{x.operation}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
      <article className="panel"><h2>By model</h2><div className="admin-table-list">{byModel.map((x) => <div key={x.model}><strong>{x.model}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
      <article className="panel"><h2>Top-cost users</h2><div className="admin-table-list">{topUsers.map((x) => <div key={x.userId}><strong>{emails.get(x.userId) ?? x.userId}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
    </section>
    <section className="panel admin-table">
      <div className="admin-table-head"><span>User / operation</span><span>Model</span><span>Tokens</span><span>Latency</span><span>Cost / status</span></div>
      {recent.map((event) => <div className="admin-table-row" key={event.id}>
        <span><strong>{event.operation}</strong><small>{event.user.email} · {event.userId}{event.userCourseId ? " · "+event.userCourseId : ""}</small></span>
        <span>{event.provider} · {event.model}</span>
        <span>{event.totalTokens.toLocaleString()} total · {event.cachedInputTokens.toLocaleString()} cached</span>
        <span>{event.durationMs ?? "—"} ms · TTFT {event.timeToFirstTokenMs ?? "—"}</span>
        <span><strong>{money(event.totalCost)}</strong><small>{event.status}{event.errorCategory ? " · "+event.errorCategory : ""}</small></span>
      </div>)}
    </section>
    <nav className="admin-pagination"><span>{page > 1 ? <Link href={{pathname:"/admin/usage",query:{...q,page:page-1}}}>Previous</Link> : null}</span><span>Page {page} of {pages}</span><span>{page < pages ? <Link href={{pathname:"/admin/usage",query:{...q,page:page+1}}}>Next</Link> : null}</span></nav>
  </main>;
}
