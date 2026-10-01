import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

export default async function AdminSystemPage() {
  await requireAdmin();
  const now = new Date();
  const d1 = new Date(now.getTime() - 86400000);
  const [latestMigration, aiFailures, audits] = await Promise.all([
    db.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1
    `.catch(() => []),
    db.aiUsageEvent.count({ where: { status: "ERROR", createdAt: { gte: d1 } } }),
    db.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const release = process.env.NEXT_PUBLIC_APP_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? "unknown";
  const environment = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
  const sentryUrl = process.env.SENTRY_DASHBOARD_URL;
  const posthogUrl = process.env.POSTHOG_DASHBOARD_URL;

  return <main className="page admin-page">
    <section className="page-header compact"><p className="eyebrow">PLATFORM</p><h1>System</h1><p className="page-description">U-Vocab-owned health and maintenance state. External observability stays in Sentry/PostHog.</p></section>
    <section className="admin-metric-grid">
      <article className="panel admin-metric"><span>App environment</span><strong>{environment}</strong><small>{release}</small></article>
      <article className="panel admin-metric"><span>Database</span><strong>reachable</strong><small>{latestMigration[0]?.migration_name ?? "migration version unavailable"}</small></article>
      <article className="panel admin-metric"><span>AI failures · 24h</span><strong>{aiFailures}</strong><small>Inspect Sentry for exception-level debugging</small></article>
      <article className="panel admin-metric"><span>Background jobs</span><strong>not configured</strong><small>No scheduled notification/background-job subsystem is present yet.</small></article>
    </section>
    <section className="admin-two-column">
      <article className="panel"><h2>External observability</h2><div className="admin-action-list">{sentryUrl?<Link href={sentryUrl} target="_blank" rel="noreferrer">Open Sentry</Link>:<span className="muted">Set SENTRY_DASHBOARD_URL to link Sentry.</span>}{posthogUrl?<Link href={posthogUrl} target="_blank" rel="noreferrer">Open PostHog</Link>:<span className="muted">Set POSTHOG_DASHBOARD_URL to link PostHog.</span>}</div></article>
      <article className="panel"><h2>Health checks</h2><div className="admin-table-list"><div><strong>Database query</strong><span>OK</span><b>{new Date().toLocaleString()}</b></div><div><strong>Release metadata</strong><span>{release === "unknown" ? "missing" : "configured"}</span><b>{environment}</b></div></div></article>
    </section>
    <section className="panel"><h2>Admin audit log</h2><div className="admin-table-list">{audits.map(a=><div key={a.id}><strong>{a.action}</strong><span>{a.adminUserId} → {a.targetType}:{a.targetId}</span><b>{a.createdAt.toLocaleString()}</b></div>)}{!audits.length?<p className="muted">No privileged mutations recorded.</p>:null}</div></section>
  </main>;
}
