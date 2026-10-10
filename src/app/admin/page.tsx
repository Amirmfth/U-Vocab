import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

function n(value: number | bigint | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-US");
}
function money(value: unknown) {
  if (value === null || value === undefined) return "unpriced";
  return "$" + Number(value).toFixed(4);
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const today = new Date(now); today.setUTCHours(0, 0, 0, 0);

  const [
    totalUsers,
    users7,
    users30,
    active30,
    planCounts,
    subscriptionCount,
    todayCost,
    cost7,
    cost30,
    aiTotals,
    topOps,
    recentFlags,
    recentAudits,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: d7 } } }),
    db.user.count({ where: { createdAt: { gte: d30 } } }),
    db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "userId")::bigint AS count FROM (
        SELECT "userId" FROM "AIUsageEvent" WHERE "createdAt" >= ${d30}
        UNION
        SELECT "userId" FROM "Attempt" WHERE "createdAt" >= ${d30}
        UNION
        SELECT "userId" FROM "LearningSession" WHERE "lastActiveAt" >= ${d30}
      ) activity
    `,
    db.$queryRaw<Array<{ plan: string; count: bigint }>>`
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM "Subscription" s
        WHERE s."userId" = u.id
          AND s.plan = 'PRO'
          AND s.status IN ('ACTIVE','GRACE')
          AND s."currentPeriodEnd" > ${now}
      ) OR EXISTS (
        SELECT 1 FROM "EntitlementGrant" g
        WHERE g."userId" = u.id
          AND g.plan = 'PRO'
          AND g."revokedAt" IS NULL
          AND g."startsAt" <= ${now}
          AND (g."endsAt" IS NULL OR g."endsAt" > ${now}
          )
      ) THEN 'PRO' ELSE 'FREE' END AS plan, COUNT(*)::bigint AS count
      FROM "User" u GROUP BY plan
    `,
    db.subscription.count({
      where: { status: { in: ["ACTIVE", "GRACE"] }, currentPeriodEnd: { gt: now } },
    }),
    db.aiUsageEvent.aggregate({ where: { createdAt: { gte: today } }, _sum: { totalCost: true } }),
    db.aiUsageEvent.aggregate({ where: { createdAt: { gte: d7 } }, _sum: { totalCost: true } }),
    db.aiUsageEvent.aggregate({ where: { createdAt: { gte: d30 } }, _sum: { totalCost: true } }),
    db.aiUsageEvent.aggregate({
      where: { createdAt: { gte: d30 } },
      _count: { _all: true },
      _sum: { totalCost: true, totalTokens: true },
    }),
    db.aiUsageEvent.groupBy({
      by: ["operation"],
      where: { createdAt: { gte: d30 } },
      _count: { _all: true },
      _sum: { totalCost: true },
      orderBy: { _sum: { totalCost: "desc" } },
      take: 6,
    }),
    db.lexemeProvenance.findMany({
      where: { reviewState: "FLAGGED" },
      select: { id: true, lexemeId: true, provider: true, model: true, createdAt: true, lexeme: { select: { lemma: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const pro = Number(planCounts.find((x) => x.plan === "PRO")?.count ?? 0);
  const free = Number(planCounts.find((x) => x.plan === "FREE")?.count ?? 0);
  const requests = aiTotals._count._all;
  const failures = await db.aiUsageEvent.count({ where: { createdAt: { gte: d30 }, status: "ERROR" } });
  const active = Number(active30[0]?.count ?? 0);
  const cost30Number = aiTotals._sum.totalCost ? Number(aiTotals._sum.totalCost) : 0;

  return (
    <main className="page admin-page flex flex-col max-w-uv-fe3c59b9c7 gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">OPERATIONS</p>
        <h1>Admin dashboard</h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">U-Vocab-owned operational state. Use Sentry and PostHog for deep error and funnel investigation.</p>
      </section>

      <section className="admin-metric-grid grid uv-grid-template-columns-2c434107cb uv-gap-56bd79d94e uv-margin-bottom-19feeb881c">
        {[
          ["Users", n(totalUsers), `+${n(users7)} in 7d · +${n(users30)} in 30d`],
          ["Active users · 30d", n(active), "AI, practice, or learning-session activity"],
          ["Plans", `${n(pro)} Pro`, `${n(free)} Free · ${n(subscriptionCount)} active subscriptions`],
          ["AI spend", money(todayCost._sum.totalCost), `${money(cost7._sum.totalCost)} 7d · ${money(cost30._sum.totalCost)} 30d`],
          ["AI cost / active user", active ? money(cost30Number / active) : "$0.0000", "30-day recorded cost"],
          ["AI failure rate", requests ? ((failures / requests) * 100).toFixed(2) + "%" : "0%", `${n(requests)} requests · ${n(aiTotals._sum.totalTokens)} tokens`],
        ].map(([label,value,help]) => <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c" key={label}><span>{label}</span><strong>{value}</strong><small>{help}</small></article>)}
      </section>

      <section className="admin-two-column grid uv-gap-19feeb881c uv-margin-c3f2ebc6d1 uv-grid-template-columns-dd0b1a1848 uv-max900:uv-grid-template-columns-6a5c4d4d49">
        <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft"><div><p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">COST</p><h2>High-cost operations · 30d</h2></div><Link href="/admin/usage">Explore</Link></div>
          <div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">
            {topOps.map((row) => <div key={row.operation}><strong>{row.operation}</strong><span>{n(row._count._all)} requests</span><b>{money(row._sum.totalCost)}</b></div>)}
            {!topOps.length ? <p className="muted text-uv-text-muted">No AI usage yet.</p> : null}
          </div>
        </article>
        <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft"><div><p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">LEXICON</p><h2>Recent flags</h2></div><Link href="/admin/lexicon?review=FLAGGED">Review</Link></div>
          <div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">
            {recentFlags.map((flag) => <div key={flag.id}><strong>{flag.lexeme.lemma}</strong><span>{flag.provider ?? "unknown"} · {flag.model ?? "unknown"}</span><b>{flag.createdAt.toISOString().slice(0,10)}</b></div>)}
            {!recentFlags.length ? <p className="muted text-uv-text-muted">No flagged provenance.</p> : null}
          </div>
        </article>
      </section>

      <section className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
        <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft"><div><p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">AUDIT</p><h2>Recent privileged changes</h2></div></div>
        <div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">
          {recentAudits.map((row) => <div key={row.id}><strong>{row.action}</strong><span>{row.targetType} · {row.targetId}</span><b>{row.createdAt.toLocaleString()}</b></div>)}
          {!recentAudits.length ? <p className="muted text-uv-text-muted">No admin mutations recorded yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
