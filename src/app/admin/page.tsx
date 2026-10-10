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
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">OPERATIONS</p>
        <h1>Admin dashboard</h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 line-height-1p65">U-Vocab-owned operational state. Use Sentry and PostHog for deep error and funnel investigation.</p>
      </section>

      <section className="admin-metric-grid grid grid-template-columns-repeat-auto-fit-minmax-210px-1fr gap-p85rem margin-bottom-1rem">
        {[
          ["Users", n(totalUsers), `+${n(users7)} in 7d · +${n(users30)} in 30d`],
          ["Active users · 30d", n(active), "AI, practice, or learning-session activity"],
          ["Plans", `${n(pro)} Pro`, `${n(free)} Free · ${n(subscriptionCount)} active subscriptions`],
          ["AI spend", money(todayCost._sum.totalCost), `${money(cost7._sum.totalCost)} 7d · ${money(cost30._sum.totalCost)} 30d`],
          ["AI cost / active user", active ? money(cost30Number / active) : "$0.0000", "30-day recorded cost"],
          ["AI failure rate", requests ? ((failures / requests) * 100).toFixed(2) + "%" : "0%", `${n(requests)} requests · ${n(aiTotals._sum.totalTokens)} tokens`],
        ].map(([label,value,help]) => <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-uv-fab62110780 rounded-uv-r6d27d54c6c" key={label}><span>{label}</span><strong>{value}</strong><small>{help}</small></article>)}
      </section>

      <section className="admin-two-column grid gap-1rem margin-1rem-0 grid-template-columns-repeat-2-minmax-0-1fr uv-max900:grid-template-columns-1fr">
        <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft"><div><p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">COST</p><h2>High-cost operations · 30d</h2></div><Link href="/admin/usage">Explore</Link></div>
          <div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-uv-f6b4e408307 in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-uv-f6b4e408307 in-b:text-uv-c7dbd63a13e in-b:font-medium">
            {topOps.map((row) => <div key={row.operation}><strong>{row.operation}</strong><span>{n(row._count._all)} requests</span><b>{money(row._sum.totalCost)}</b></div>)}
            {!topOps.length ? <p className="muted text-uv-text-muted">No AI usage yet.</p> : null}
          </div>
        </article>
        <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft"><div><p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">LEXICON</p><h2>Recent flags</h2></div><Link href="/admin/lexicon?review=FLAGGED">Review</Link></div>
          <div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-uv-f6b4e408307 in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-uv-f6b4e408307 in-b:text-uv-c7dbd63a13e in-b:font-medium">
            {recentFlags.map((flag) => <div key={flag.id}><strong>{flag.lexeme.lemma}</strong><span>{flag.provider ?? "unknown"} · {flag.model ?? "unknown"}</span><b>{flag.createdAt.toISOString().slice(0,10)}</b></div>)}
            {!recentFlags.length ? <p className="muted text-uv-text-muted">No flagged provenance.</p> : null}
          </div>
        </article>
      </section>

      <section className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c">
        <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft"><div><p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">AUDIT</p><h2>Recent privileged changes</h2></div></div>
        <div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-uv-f6b4e408307 in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-uv-f6b4e408307 in-b:text-uv-c7dbd63a13e in-b:font-medium">
          {recentAudits.map((row) => <div key={row.id}><strong>{row.action}</strong><span>{row.targetType} · {row.targetId}</span><b>{row.createdAt.toLocaleString()}</b></div>)}
          {!recentAudits.length ? <p className="muted text-uv-text-muted">No admin mutations recorded yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
