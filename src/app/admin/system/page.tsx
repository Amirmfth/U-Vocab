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

  return <main className="page admin-page [display:flex] [flex-direction:column] [max-width:1480px] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
    <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]"><p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">PLATFORM</p><h1>System</h1><p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">U-Vocab-owned health and maintenance state. External observability stays in Sentry/PostHog.</p></section>
    <section className="admin-metric-grid [display:grid] [grid-template-columns:repeat(auto-fit,_minmax(210px,_1fr))] [gap:.85rem] [margin-bottom:1rem]">
      <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>App environment</span><strong>{environment}</strong><small>{release}</small></article>
      <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>Database</span><strong>reachable</strong><small>{latestMigration[0]?.migration_name ?? "migration version unavailable"}</small></article>
      <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>AI failures · 24h</span><strong>{aiFailures}</strong><small>Inspect Sentry for exception-level debugging</small></article>
      <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>Review notification job</span><strong>{activePushSubscriptions} devices</strong><small>{notificationDeliveries24h} deliveries · {notificationFailures24h} failures in 24h</small></article>
    </section>
    <section className="admin-two-column [display:grid] [gap:1rem] [margin:1rem_0] [grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[900px]:[grid-template-columns:1fr]">
      <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>External observability</h2><div className="admin-action-list [display:grid] [gap:.65rem] [margin-top:.8rem]">{sentryUrl?<Link href={sentryUrl} target="_blank" rel="noreferrer">Open Sentry</Link>:<span className="muted [color:var(--text-muted)]">Set SENTRY_DASHBOARD_URL to link Sentry.</span>}{posthogUrl?<Link href={posthogUrl} target="_blank" rel="noreferrer">Open PostHog</Link>:<span className="muted [color:var(--text-muted)]">Set POSTHOG_DASHBOARD_URL to link PostHog.</span>}</div></article>
      <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>Health checks</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]"><div><strong>Database query</strong><span>OK</span><b>{new Date().toLocaleString()}</b></div><div><strong>Release metadata</strong><span>{release === "unknown" ? "missing" : "configured"}</span><b>{environment}</b></div></div></article>
    </section>
    <section className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>Admin audit log</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{audits.map(a=><div key={a.id}><strong>{a.action}</strong><span>{a.adminUserId} → {a.targetType}:{a.targetId}</span><b>{a.createdAt.toLocaleString()}</b></div>)}{!audits.length?<p className="muted [color:var(--text-muted)]">No privileged mutations recorded.</p>:null}</div></section>
  </main>;
}
