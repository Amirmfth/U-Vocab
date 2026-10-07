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

  return <main className="page admin-page [display:flex] [flex-direction:column] [max-width:1480px] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
    <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]"><p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">AI OPERATIONS</p><h1>AI usage & cost</h1><p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">Authoritative database telemetry from AiUsageEvent. No prompt or learner-content payloads are shown.</p></section>
    <form className="panel admin-filter-bar [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [gap:.7rem] [align-items:end] [flex-wrap:wrap] [margin-bottom:1rem] [&_input]:[min-height:2.55rem] [&_select]:[min-height:2.55rem] [border-radius:18px]" method="get">
      <input name="user" defaultValue={q.user} placeholder="User ID" />
      <input name="course" defaultValue={q.course} placeholder="Course ID" />
      <select name="operation" defaultValue={q.operation ?? ""}><option value="">All operations</option>{operations.map((o) => <option key={o.operation}>{o.operation}</option>)}</select>
      <select name="model" defaultValue={q.model ?? ""}><option value="">All models</option>{models.map((m) => <option key={m.model}>{m.model}</option>)}</select>
      <select name="status" defaultValue={q.status ?? ""}><option value="">All statuses</option><option>SUCCESS</option><option>ERROR</option></select>
      <input type="date" name="from" defaultValue={q.from ?? ""}/><input type="date" name="to" defaultValue={q.to ?? ""}/>
      <button className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">Filter</button>
    </form>
    <section className="admin-metric-grid [display:grid] [grid-template-columns:repeat(auto-fit,_minmax(210px,_1fr))] [gap:.85rem] [margin-bottom:1rem]">
      <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>Total cost</span><strong>{money(totals._sum.totalCost)}</strong><small>{unpriced} unpriced events</small></article>
      <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>Requests</span><strong>{total.toLocaleString()}</strong><small>{total ? ((failures/total)*100).toFixed(2) : "0"}% failed</small></article>
      <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>Tokens</span><strong>{(totals._sum.totalTokens ?? 0).toLocaleString()}</strong><small>{(totals._sum.cachedInputTokens ?? 0).toLocaleString()} cached input</small></article>
      <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>Average cost</span><strong>{money(avgCost)}</strong><small>priced requests only</small></article>
      <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>Average latency</span><strong>{avgLatency ? Math.round(avgLatency)+" ms" : "—"}</strong><small>provider duration</small></article>
      <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>Average TTFT</span><strong>{avgTtft ? Math.round(avgTtft)+" ms" : "—"}</strong><small>where recorded</small></article>
    </section>
    <section className="admin-three-column [display:grid] [gap:1rem] [margin:1rem_0] [grid-template-columns:repeat(3,_minmax(0,_1fr))] max-[900px]:[grid-template-columns:1fr]">
      <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>By feature</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{byOperation.map((x) => <div key={x.operation}><strong>{x.operation}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
      <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>By model</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{byModel.map((x) => <div key={x.model}><strong>{x.model}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
      <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>Top-cost users</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{topUsers.map((x) => <div key={x.userId}><strong>{emails.get(x.userId) ?? x.userId}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
    </section>
    <section className="panel admin-table [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [overflow:hidden] max-[900px]:[overflow-x:auto] [border-radius:18px]">
      <div className="admin-table-head [display:grid] [grid-template-columns:minmax(220px,_1.5fr)_minmax(120px,_.7fr)_minmax(160px,_1fr)_minmax(160px,_1fr)_minmax(150px,_.8fr)] [gap:.75rem] [align-items:center] [padding:.8rem] [font-size:.75rem] [font-weight:800] [color:var(--muted)] [border-bottom:1px_solid_var(--border)] max-[900px]:[min-width:850px]"><span>User / operation</span><span>Model</span><span>Tokens</span><span>Latency</span><span>Cost / status</span></div>
      {recent.map((event) => <div className="admin-table-row [display:grid] [grid-template-columns:minmax(220px,_1.5fr)_minmax(120px,_.7fr)_minmax(160px,_1fr)_minmax(160px,_1fr)_minmax(150px,_.8fr)] [gap:.75rem] [align-items:center] [padding:.8rem] [color:inherit] [text-decoration:none] [border-bottom:1px_solid_var(--border)] [&:hover]:[background:var(--surface-2)] [&_>_span]:[display:grid] [&_>_span]:[gap:.15rem] [&_>_span]:[min-width:0] [&_small]:[color:var(--muted)] [&_small]:[overflow-wrap:anywhere] max-[900px]:[min-width:850px]" key={event.id}>
        <span><strong>{event.operation}</strong><small>{event.user.email} · {event.userId}{event.userCourseId ? " · "+event.userCourseId : ""}</small></span>
        <span>{event.provider} · {event.model}</span>
        <span>{event.totalTokens.toLocaleString()} total · {event.cachedInputTokens.toLocaleString()} cached</span>
        <span>{event.durationMs ?? "—"} ms · TTFT {event.timeToFirstTokenMs ?? "—"}</span>
        <span><strong>{money(event.totalCost)}</strong><small>{event.status}{event.errorCategory ? " · "+event.errorCategory : ""}</small></span>
      </div>)}
    </section>
    <nav className="admin-pagination [display:grid] [grid-template-columns:1fr_auto_1fr] [align-items:center] [margin:1rem_0] [color:var(--muted)] [&_>_:last-child]:[text-align:right]"><span>{page > 1 ? <Link href={{pathname:"/admin/usage",query:{...q,page:page-1}}}>Previous</Link> : null}</span><span>Page {page} of {pages}</span><span>{page < pages ? <Link href={{pathname:"/admin/usage",query:{...q,page:page+1}}}>Next</Link> : null}</span></nav>
  </main>;
}
