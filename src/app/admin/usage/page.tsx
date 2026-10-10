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
    <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade"><p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">AI OPERATIONS</p><h1>AI usage & cost</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">Authoritative database telemetry from AiUsageEvent. No prompt or learner-content payloads are shown.</p></section>
    <form className="panel admin-filter-bar uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex uv-gap-f73364d9bf items-end flex-wrap uv-margin-bottom-19feeb881c uv-vcf5ce320fa:uv-min-height-e005337472 uv-vfc0df1ac56:uv-min-height-e005337472 rounded-uv-r6d27d54c6c" method="get">
      <input name="user" defaultValue={q.user} placeholder="User ID" />
      <input name="course" defaultValue={q.course} placeholder="Course ID" />
      <select name="operation" defaultValue={q.operation ?? ""}><option value="">All operations</option>{operations.map((o) => <option key={o.operation}>{o.operation}</option>)}</select>
      <select name="model" defaultValue={q.model ?? ""}><option value="">All models</option>{models.map((m) => <option key={m.model}>{m.model}</option>)}</select>
      <select name="status" defaultValue={q.status ?? ""}><option value="">All statuses</option><option>SUCCESS</option><option>ERROR</option></select>
      <input type="date" name="from" defaultValue={q.from ?? ""}/><input type="date" name="to" defaultValue={q.to ?? ""}/>
      <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">Filter</button>
    </form>
    <section className="admin-metric-grid grid uv-grid-template-columns-2c434107cb uv-gap-56bd79d94e uv-margin-bottom-19feeb881c">
      <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Total cost</span><strong>{money(totals._sum.totalCost)}</strong><small>{unpriced} unpriced events</small></article>
      <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Requests</span><strong>{total.toLocaleString()}</strong><small>{total ? ((failures/total)*100).toFixed(2) : "0"}% failed</small></article>
      <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Tokens</span><strong>{(totals._sum.totalTokens ?? 0).toLocaleString()}</strong><small>{(totals._sum.cachedInputTokens ?? 0).toLocaleString()} cached input</small></article>
      <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Average cost</span><strong>{money(avgCost)}</strong><small>priced requests only</small></article>
      <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Average latency</span><strong>{avgLatency ? Math.round(avgLatency)+" ms" : "—"}</strong><small>provider duration</small></article>
      <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Average TTFT</span><strong>{avgTtft ? Math.round(avgTtft)+" ms" : "—"}</strong><small>where recorded</small></article>
    </section>
    <section className="admin-three-column grid uv-gap-19feeb881c uv-margin-c3f2ebc6d1 uv-grid-template-columns-563355decf uv-max900:uv-grid-template-columns-6a5c4d4d49">
      <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>By feature</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{byOperation.map((x) => <div key={x.operation}><strong>{x.operation}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
      <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>By model</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{byModel.map((x) => <div key={x.model}><strong>{x.model}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
      <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>Top-cost users</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{topUsers.map((x) => <div key={x.userId}><strong>{emails.get(x.userId) ?? x.userId}</strong><span>{x._count._all} requests · {(x._sum.totalTokens ?? 0).toLocaleString()} tokens</span><b>{money(x._sum.totalCost)}</b></div>)}</div></article>
    </section>
    <section className="panel admin-table uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 overflow-hidden uv-max900:overflow-x-auto rounded-uv-r6d27d54c6c">
      <div className="admin-table-head grid uv-grid-template-columns-efe4e3d144 uv-gap-60ac4cf407 items-center uv-padding-dbd07cbfaa text-uv-f60ac4cf407 font-extrabold text-uv-c7dbd63a13e uv-border-bottom-8d7f82f403 uv-max900:min-w-uv-e4de6849ea"><span>User / operation</span><span>Model</span><span>Tokens</span><span>Latency</span><span>Cost / status</span></div>
      {recent.map((event) => <div className="admin-table-row grid uv-grid-template-columns-efe4e3d144 uv-gap-60ac4cf407 items-center uv-padding-dbd07cbfaa text-inherit no-underline uv-border-bottom-8d7f82f403 hover:bg-uv-c176590bb24 uv-v22810335d8:grid uv-v22810335d8:uv-gap-bc493dc595 uv-v22810335d8:min-w-0 uv-v982220ddd5:text-uv-c7dbd63a13e uv-v982220ddd5:uv-overflow-wrap-112c2a063a uv-max900:min-w-uv-e4de6849ea" key={event.id}>
        <span><strong>{event.operation}</strong><small>{event.user.email} · {event.userId}{event.userCourseId ? " · "+event.userCourseId : ""}</small></span>
        <span>{event.provider} · {event.model}</span>
        <span>{event.totalTokens.toLocaleString()} total · {event.cachedInputTokens.toLocaleString()} cached</span>
        <span>{event.durationMs ?? "—"} ms · TTFT {event.timeToFirstTokenMs ?? "—"}</span>
        <span><strong>{money(event.totalCost)}</strong><small>{event.status}{event.errorCategory ? " · "+event.errorCategory : ""}</small></span>
      </div>)}
    </section>
    <nav className="admin-pagination grid uv-grid-template-columns-e4c3efd568 items-center uv-margin-c3f2ebc6d1 text-uv-c7dbd63a13e uv-v87e7c148d8:text-right"><span>{page > 1 ? <Link href={{pathname:"/admin/usage",query:{...q,page:page-1}}}>Previous</Link> : null}</span><span>Page {page} of {pages}</span><span>{page < pages ? <Link href={{pathname:"/admin/usage",query:{...q,page:page+1}}}>Next</Link> : null}</span></nav>
  </main>;
}
