import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { ConfirmSubmitButton } from "../ConfirmSubmitButton";
import { revokeEntitlementAction } from "../actions";

const PAGE_SIZE = 30;

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const q = await searchParams;
  const page = Math.max(1, Number.parseInt(q.page ?? "1", 10) || 1);
  const [subscriptions, grants, quotaUsage] = await Promise.all([
    db.subscription.findMany({
      select: { id: true, userId: true, plan: true, provider: true, status: true, currentPeriodStart: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, user: { select: { email: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.entitlementGrant.findMany({
      select: { id: true, userId: true, plan: true, source: true, startsAt: true, endsAt: true, revokedAt: true, reason: true, user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.quotaUsageEvent.findMany({
      select: { id: true, userId: true, operationKey: true, amount: true, periodEnd: true, createdAt: true, user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return <main className="page admin-page [display:flex] [flex-direction:column] [max-width:1480px] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
    <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]"><p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">BILLING STATE</p><h1>Subscriptions</h1><p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">Provider status is read-only here. Manual entitlement grants are the supported admin override.</p></section>
    <section className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>Provider subscriptions</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{subscriptions.map((s) => <div key={s.id}><strong>{s.user.email} · {s.plan}</strong><span>{s.provider} · {s.status}{s.cancelAtPeriodEnd ? " · cancel at end" : ""}</span><b>{s.currentPeriodStart.toISOString().slice(0,10)} → {s.currentPeriodEnd.toISOString().slice(0,10)}</b></div>)}</div></section>
    <section className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>Manual grants / overrides</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{grants.map((g) => <div key={g.id}><strong>{g.user.email} · {g.plan}</strong><span>{g.source} · {g.revokedAt ? "revoked" : "active"} · {g.endsAt?.toLocaleString() ?? "no expiry"}</span>{!g.revokedAt ? <form action={revokeEntitlementAction}><input type="hidden" name="grantId" value={g.id}/><ConfirmSubmitButton message="Revoke this manual entitlement?">Revoke</ConfirmSubmitButton></form> : <b>{g.reason ?? ""}</b>}</div>)}</div></section>
    <section className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>Recent quota usage</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{quotaUsage.map((q) => <div key={q.id}><strong>{q.user.email}</strong><span>{q.operationKey} · +{q.amount}</span><b>{q.createdAt.toLocaleString()} · resets {q.periodEnd.toLocaleString()}</b></div>)}</div></section>
  </main>;
}
