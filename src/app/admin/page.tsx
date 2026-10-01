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
    <main className="page admin-page">
      <section className="page-header compact">
        <p className="eyebrow">OPERATIONS</p>
        <h1>Admin dashboard</h1>
        <p className="page-description">U-Vocab-owned operational state. Use Sentry and PostHog for deep error and funnel investigation.</p>
      </section>

      <section className="admin-metric-grid">
        {[
          ["Users", n(totalUsers), `+${n(users7)} in 7d · +${n(users30)} in 30d`],
          ["Active users · 30d", n(active), "AI, practice, or learning-session activity"],
          ["Plans", `${n(pro)} Pro`, `${n(free)} Free · ${n(subscriptionCount)} active subscriptions`],
          ["AI spend", money(todayCost._sum.totalCost), `${money(cost7._sum.totalCost)} 7d · ${money(cost30._sum.totalCost)} 30d`],
          ["AI cost / active user", active ? money(cost30Number / active) : "$0.0000", "30-day recorded cost"],
          ["AI failure rate", requests ? ((failures / requests) * 100).toFixed(2) + "%" : "0%", `${n(requests)} requests · ${n(aiTotals._sum.totalTokens)} tokens`],
        ].map(([label,value,help]) => <article className="panel admin-metric" key={label}><span>{label}</span><strong>{value}</strong><small>{help}</small></article>)}
      </section>

      <section className="admin-two-column">
        <article className="panel">
          <div className="section-heading"><div><p className="eyebrow">COST</p><h2>High-cost operations · 30d</h2></div><Link href="/admin/usage">Explore</Link></div>
          <div className="admin-table-list">
            {topOps.map((row) => <div key={row.operation}><strong>{row.operation}</strong><span>{n(row._count._all)} requests</span><b>{money(row._sum.totalCost)}</b></div>)}
            {!topOps.length ? <p className="muted">No AI usage yet.</p> : null}
          </div>
        </article>
        <article className="panel">
          <div className="section-heading"><div><p className="eyebrow">LEXICON</p><h2>Recent flags</h2></div><Link href="/admin/lexicon?review=FLAGGED">Review</Link></div>
          <div className="admin-table-list">
            {recentFlags.map((flag) => <div key={flag.id}><strong>{flag.lexeme.lemma}</strong><span>{flag.provider ?? "unknown"} · {flag.model ?? "unknown"}</span><b>{flag.createdAt.toISOString().slice(0,10)}</b></div>)}
            {!recentFlags.length ? <p className="muted">No flagged provenance.</p> : null}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">AUDIT</p><h2>Recent privileged changes</h2></div></div>
        <div className="admin-table-list">
          {recentAudits.map((row) => <div key={row.id}><strong>{row.action}</strong><span>{row.targetType} · {row.targetId}</span><b>{row.createdAt.toLocaleString()}</b></div>)}
          {!recentAudits.length ? <p className="muted">No admin mutations recorded yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
