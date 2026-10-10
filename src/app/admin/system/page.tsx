import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

export default async function AdminSystemPage() {
  await requireAdmin();
  const now = new Date();
  const d1 = new Date(now.getTime() - 86400000);
  const [latestMigration, aiFailures, audits, activePushSubscriptions, notificationDeliveries24h, notificationFailures24h] = await Promise.all([
    db.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1
    `.catch(() => []),
    db.aiUsageEvent.count({ where: { status: "ERROR", createdAt: { gte: d1 } } }),
    db.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    db.webPushSubscription.count({ where: { status: "ACTIVE" } }),
    db.notificationDelivery.count({ where: { createdAt: { gte: d1 } } }),
    db.notificationDelivery.count({ where: { createdAt: { gte: d1 }, status: { in: ["FAILED_TRANSIENT", "FAILED_PERMANENT"] } } }),
  ]);
  const release = process.env.NEXT_PUBLIC_APP_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? "unknown";
  const environment = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
  const sentryUrl = process.env.SENTRY_DASHBOARD_URL;
  const posthogUrl = process.env.POSTHOG_DASHBOARD_URL;

  return <main className="page admin-page flex flex-col max-w-uv-fe3c59b9c7 gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
    <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem"><p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">PLATFORM</p><h1>System</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">U-Vocab-owned health and maintenance state. External observability stays in Sentry/PostHog.</p></section>
    <section className="admin-metric-grid grid grid-template-columns-repeat-auto-fit-minmax-210px-1fr gap-p85rem margin-bottom-1rem">
      <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-exact-1p45rem rounded-exact-18px"><span>App environment</span><strong>{environment}</strong><small>{release}</small></article>
      <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-exact-1p45rem rounded-exact-18px"><span>Database</span><strong>reachable</strong><small>{latestMigration[0]?.migration_name ?? "migration version unavailable"}</small></article>
      <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-exact-1p45rem rounded-exact-18px"><span>AI failures · 24h</span><strong>{aiFailures}</strong><small>Inspect Sentry for exception-level debugging</small></article>
      <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-exact-1p45rem rounded-exact-18px"><span>Review notification job</span><strong>{activePushSubscriptions} devices</strong><small>{notificationDeliveries24h} deliveries · {notificationFailures24h} failures in 24h</small></article>
    </section>
    <section className="admin-two-column grid gap-1rem margin-1rem-0 grid-template-columns-repeat-2-minmax-0-1fr uv-max900:grid-template-columns-1fr">
      <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px"><h2>External observability</h2><div className="admin-action-list grid gap-p65rem margin-top-p8rem">{sentryUrl?<Link href={sentryUrl} target="_blank" rel="noreferrer">Open Sentry</Link>:<span className="muted text-uv-text-muted">Set SENTRY_DASHBOARD_URL to link Sentry.</span>}{posthogUrl?<Link href={posthogUrl} target="_blank" rel="noreferrer">Open PostHog</Link>:<span className="muted text-uv-text-muted">Set POSTHOG_DASHBOARD_URL to link PostHog.</span>}</div></article>
      <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px"><h2>Health checks</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-exact-p84rem in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-exact-p84rem in-b:text-uv-c7dbd63a13e in-b:font-medium"><div><strong>Database query</strong><span>OK</span><b>{new Date().toLocaleString()}</b></div><div><strong>Release metadata</strong><span>{release === "unknown" ? "missing" : "configured"}</span><b>{environment}</b></div></div></article>
    </section>
    <section className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px"><h2>Admin audit log</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-exact-p84rem in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-exact-p84rem in-b:text-uv-c7dbd63a13e in-b:font-medium">{audits.map(a=><div key={a.id}><strong>{a.action}</strong><span>{a.adminUserId} → {a.targetType}:{a.targetId}</span><b>{a.createdAt.toLocaleString()}</b></div>)}{!audits.length?<p className="muted text-uv-text-muted">No privileged mutations recorded.</p>:null}</div></section>
  </main>;
}
