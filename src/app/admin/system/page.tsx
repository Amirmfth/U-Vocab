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
    <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade"><p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">PLATFORM</p><h1>System</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">U-Vocab-owned health and maintenance state. External observability stays in Sentry/PostHog.</p></section>
    <section className="admin-metric-grid grid uv-grid-template-columns-2c434107cb uv-gap-56bd79d94e uv-margin-bottom-19feeb881c">
      <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>App environment</span><strong>{environment}</strong><small>{release}</small></article>
      <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Database</span><strong>reachable</strong><small>{latestMigration[0]?.migration_name ?? "migration version unavailable"}</small></article>
      <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>AI failures · 24h</span><strong>{aiFailures}</strong><small>Inspect Sentry for exception-level debugging</small></article>
      <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Review notification job</span><strong>{activePushSubscriptions} devices</strong><small>{notificationDeliveries24h} deliveries · {notificationFailures24h} failures in 24h</small></article>
    </section>
    <section className="admin-two-column grid uv-gap-19feeb881c uv-margin-c3f2ebc6d1 uv-grid-template-columns-dd0b1a1848 uv-max900:uv-grid-template-columns-6a5c4d4d49">
      <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>External observability</h2><div className="admin-action-list grid uv-gap-888e967739 uv-margin-top-dbd07cbfaa">{sentryUrl?<Link href={sentryUrl} target="_blank" rel="noreferrer">Open Sentry</Link>:<span className="muted text-uv-text-muted">Set SENTRY_DASHBOARD_URL to link Sentry.</span>}{posthogUrl?<Link href={posthogUrl} target="_blank" rel="noreferrer">Open PostHog</Link>:<span className="muted text-uv-text-muted">Set POSTHOG_DASHBOARD_URL to link PostHog.</span>}</div></article>
      <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>Health checks</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium"><div><strong>Database query</strong><span>OK</span><b>{new Date().toLocaleString()}</b></div><div><strong>Release metadata</strong><span>{release === "unknown" ? "missing" : "configured"}</span><b>{environment}</b></div></div></article>
    </section>
    <section className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>Admin audit log</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{audits.map(a=><div key={a.id}><strong>{a.action}</strong><span>{a.adminUserId} → {a.targetType}:{a.targetId}</span><b>{a.createdAt.toLocaleString()}</b></div>)}{!audits.length?<p className="muted text-uv-text-muted">No privileged mutations recorded.</p>:null}</div></section>
  </main>;
}
