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

  return <main className="page admin-page flex flex-col max-w-uv-fe3c59b9c7 gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
    <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade"><p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">AI OPERATIONS</p><h1>AI usage & cost</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 line-height-1p65">Authoritative database telemetry from AiUsageEvent. No prompt or learner-content payloads are shown.</p></section>
    <form className="panel admin-filter-bar border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex gap-p7rem items-end flex-wrap margin-bottom-1rem in-input:min-height-2p55rem in-select:min-height-2p55rem rounded-uv-r6d27d54c6c" method="get">
      <input name="user" defaultValue={q.user} placeholder="User ID" />
      <input name="course" defaultValue={q.course} placeholder="Course ID" />
      <select name="operation" defaultValue={q.operation ?? ""}><option value="">All operations</option>{operations.map((o) => <option key={o.operation}>{o.operation}</option>)}</select>
      <select name="model" defaultValue={q.model ?? ""}><option value="">All models</option>{models.map((m) => <option key={m.model}>{m.model}</option>)}</select>
      <select name="status" defaultValue={q.status ?? ""}><option value="">All statuses</option><option>SUCCESS</option><option>ERROR</option></select>
      <input type="date" name="from" defaultValue={q.from ?? ""}/><input type="date" name="to" defaultValue={q.to ?? ""}/>
      <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">Filter</button>
    </form>
    <section className="admin-metric-grid grid grid-template-columns-repeat-auto-fit-minmax-210px-1fr gap-p85rem margin-bottom-1rem">
      <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Total cost</span><strong>{money(totals._sum.totalCost)}</strong><small>{unpriced} unpriced events</small></article>
      <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Requests</span><strong>{total.toLocaleString()}</strong><small>{total ? ((failures/total)*100).toFixed(2) : "0"}% failed</small></article>
      <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Tokens</span><strong>{(totals._sum.totalTokens ?? 0).toLocaleString()}</strong><small>{(totals._sum.cachedInputTokens ?? 0).toLocaleString()} cached input</small></article>
      <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Average cost</span><strong>{money(avgCost)}</strong><small>priced requests only</small></article>
      <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Average latency</span><strong>{avgLatency ? Math.round(avgLatency)+" ms" : "—"}</strong><small>provider duration</small></article>
      <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Average TTFT</span><strong>{avgTtft ? Math.round(avgTtft)+" ms" : "—"}</strong><small>where recorded</small></article>
    </section>
    <section className="admin-three-column grid gap-1rem margin-1rem-0 grid-template-columns-repeat-3-minmax-0-1fr uv-max900:grid-template-columns-1fr">
      <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c"><h2>By feature</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-uv-f6b4e408307 in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-uv-f6b4e408307 in-b:text-uv-c7dbd63a13e in-b:font-medium">{byOperation.map((x) => <div key={x.operation}><strong>{x.operation}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
      <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c"><h2>By model</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-uv-f6b4e408307 in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-uv-f6b4e408307 in-b:text-uv-c7dbd63a13e in-b:font-medium">{byModel.map((x) => <div key={x.model}><strong>{x.model}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
      <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c"><h2>Top-cost users</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-uv-f6b4e408307 in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-uv-f6b4e408307 in-b:text-uv-c7dbd63a13e in-b:font-medium">{topUsers.map((x) => <div key={x.userId}><strong>{emails.get(x.userId) ?? x.userId}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
    </section>
    <section className="panel admin-table border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 overflow-hidden uv-max900:overflow-x-auto rounded-uv-r6d27d54c6c">
      <div className="admin-table-head grid grid-template-columns-minmax-220px-1p5fr-minmax-120px-p7fr-minm gap-p75rem items-center padding-p8rem text-uv-f60ac4cf407 font-extrabold text-uv-c7dbd63a13e border-1px-solid-border uv-max900:min-w-uv-e4de6849ea"><span>User / operation</span><span>Model</span><span>Tokens</span><span>Latency</span><span>Cost / status</span></div>
      {recent.map((event) => <div className="admin-table-row grid grid-template-columns-minmax-220px-1p5fr-minmax-120px-p7fr-minm gap-p75rem items-center padding-p8rem text-inherit no-underline border-1px-solid-border hover:bg-uv-c176590bb24 in-span-2:grid in-span-2:gap-p15rem in-span-2:min-w-0 in-small:text-uv-c7dbd63a13e in-small:overflow-wrap-anywhere uv-max900:min-w-uv-e4de6849ea" key={event.id}>
        <span><strong>{event.operation}</strong><small>{event.user.email} · {event.userId}{event.userCourseId ? " · "+event.userCourseId : ""}</small></span>
        <span>{event.provider} · {event.model}</span>
        <span>{event.totalTokens.toLocaleString()} total · {event.cachedInputTokens.toLocaleString()} cached</span>
        <span>{event.durationMs ?? "—"} ms · TTFT {event.timeToFirstTokenMs ?? "—"}</span>
        <span><strong>{money(event.totalCost)}</strong><small>{event.status}{event.errorCategory ? " · "+event.errorCategory : ""}</small></span>
      </div>)}
    </section>
    <nav className="admin-pagination grid grid-template-columns-1fr-auto-1fr items-center margin-1rem-0 text-uv-c7dbd63a13e in-last-child:text-right"><span>{page > 1 ? <Link href={{pathname:"/admin/usage",query:{...q,page:page-1}}}>Previous</Link> : null}</span><span>Page {page} of {pages}</span><span>{page < pages ? <Link href={{pathname:"/admin/usage",query:{...q,page:page+1}}}>Next</Link> : null}</span></nav>
  </main>;
}
