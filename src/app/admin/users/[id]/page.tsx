import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { getEffectivePlan, getQuotaSummary } from "@/lib/entitlements/service";
import { ConfirmSubmitButton } from "../../ConfirmSubmitButton";
import { grantEntitlementAction, revokeEntitlementAction, revokeSessionsAction } from "../../actions";

function money(value: unknown) {
  return value === null || value === undefined ? "unpriced" : "$" + Number(value).toFixed(4);
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, emailVerified: true, role: true, timezone: true, uiLocale: true, createdAt: true, activeCourseId: true,
      courses: { select: { id: true, targetLanguage: true, currentLevel: true, targetLevel: true, explanationLanguage: true, status: true, _count: { select: { vocabulary: true, attempts: true, mistakes: true } } }, orderBy: { createdAt: "asc" } },
      subscriptions: { select: { id: true, plan: true, provider: true, status: true, currentPeriodStart: true, currentPeriodEnd: true, cancelAtPeriodEnd: true }, orderBy: { createdAt: "desc" }, take: 12 },
      entitlementGrants: { select: { id: true, plan: true, source: true, reason: true, startsAt: true, endsAt: true, revokedAt: true, createdBy: true }, orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { vocabulary: true, sessions: true, attempts: true, mistakes: true } },
    },
  });
  if (!user) notFound();
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const [plan, ai7, ai30, recentAi, quotas] = await Promise.all([
    getEffectivePlan(user.id),
    db.aiUsageEvent.aggregate({ where: { userId: user.id, createdAt: { gte: d7 } }, _count: { _all: true }, _sum: { totalCost: true, totalTokens: true } }),
    db.aiUsageEvent.aggregate({ where: { userId: user.id, createdAt: { gte: d30 } }, _count: { _all: true }, _sum: { totalCost: true, totalTokens: true } }),
    db.aiUsageEvent.findMany({ where: { userId: user.id }, select: { id: true, operation: true, model: true, status: true, totalCost: true, totalTokens: true, durationMs: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 15 }),
    user.activeCourseId ? getQuotaSummary({ userId: user.id, userCourseId: user.activeCourseId, timeZone: user.timezone }) : Promise.resolve([]),
  ]);

  return (
    <main className="page admin-page [display:flex] [flex-direction:column] [max-width:1480px] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
      <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]"><p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">USER DETAIL</p><h1>{user.email}</h1><p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">{user.id} · {user.role} · joined {user.createdAt.toLocaleString()}</p></section>
      <section className="admin-metric-grid [display:grid] [grid-template-columns:repeat(auto-fit,_minmax(210px,_1fr))] [gap:.85rem] [margin-bottom:1rem]">
        <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>Plan</span><strong>{plan.plan}</strong><small>{plan.source} · {plan.validUntil?.toLocaleString() ?? "no expiry"}</small></article>
        <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>Vocabulary</span><strong>{user._count.vocabulary}</strong><small>{user._count.attempts} attempts · {user._count.mistakes} mistake records</small></article>
        <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>AI · 7d</span><strong>{money(ai7._sum.totalCost)}</strong><small>{ai7._count._all} requests · {(ai7._sum.totalTokens ?? 0).toLocaleString()} tokens</small></article>
        <article className="panel admin-metric [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:.3rem] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.45rem] [border-radius:18px]"><span>AI · 30d</span><strong>{money(ai30._sum.totalCost)}</strong><small>{ai30._count._all} requests · {(ai30._sum.totalTokens ?? 0).toLocaleString()} tokens</small></article>
      </section>
      <section className="admin-two-column [display:grid] [gap:1rem] [margin:1rem_0] [grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[900px]:[grid-template-columns:1fr]">
        <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>Courses</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{user.courses.map((c) => <div key={c.id}><strong>{c.targetLanguage} · {c.currentLevel} → {c.targetLevel}</strong><span>{c.status} · {c.explanationLanguage}</span><b>{c._count.vocabulary} words · {c._count.attempts} attempts</b></div>)}</div></article>
        <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>Quota consumption</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{quotas.map((q) => <div key={q.key}><strong>{q.key}</strong><span>{q.used} / {q.limit}</span><b>resets {q.resetAt.toLocaleString()}</b></div>)}</div></article>
      </section>
      <section className="admin-two-column [display:grid] [gap:1rem] [margin:1rem_0] [grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[900px]:[grid-template-columns:1fr]">
        <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]">
          <h2>Entitlement override</h2>
          <form action={grantEntitlementAction} className="admin-stack-form [display:flex] [gap:.7rem] [flex-wrap:wrap] [&_input]:[min-height:2.55rem] [align-items:stretch] [flex-direction:column] [&_label]:[display:grid] [&_label]:[gap:.3rem] [&_label]:[font-size:.8rem] [&_label]:[color:var(--muted)]">
            <input type="hidden" name="userId" value={user.id} />
            <label>Ends at <input type="datetime-local" name="endsAt" required /></label>
            <label>Reason <input name="reason" maxLength={240} placeholder="Support / operational reason" /></label>
            <ConfirmSubmitButton message="Grant temporary Pro entitlement to this user?">Grant Pro</ConfirmSubmitButton>
          </form>
          <div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">
            {user.entitlementGrants.map((g) => <div key={g.id}><strong>{g.plan} · {g.source}</strong><span>{g.revokedAt ? "revoked" : "active"} · {g.endsAt?.toLocaleString() ?? "no expiry"}</span>{!g.revokedAt ? <form action={revokeEntitlementAction}><input type="hidden" name="grantId" value={g.id}/><ConfirmSubmitButton message="Revoke this entitlement grant?">Revoke</ConfirmSubmitButton></form> : <b>{g.reason ?? ""}</b>}</div>)}
          </div>
        </article>
        <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]">
          <h2>Account sessions</h2><p>{user._count.sessions} active session records.</p>
          <form action={revokeSessionsAction}><input type="hidden" name="userId" value={user.id}/><ConfirmSubmitButton message="Force sign-out on every device for this user?">Revoke all sessions</ConfirmSubmitButton></form>
          <h3>Subscriptions</h3><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{user.subscriptions.map((s) => <div key={s.id}><strong>{s.plan} · {s.provider}</strong><span>{s.status}{s.cancelAtPeriodEnd ? " · cancels at period end" : ""}</span><b>{s.currentPeriodEnd.toLocaleString()}</b></div>)}</div>
        </article>
      </section>
      <section className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]"><h2>Recent AI operations</h2><div className="admin-table-list [display:grid] [gap:.55rem] [margin-top:.75rem] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)_auto] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[padding:.7rem_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:first-child]:[border-top:0] [&_span]:[font-size:.84rem] [&_span]:[color:var(--muted)] [&_span]:[font-weight:500] [&_b]:[font-size:.84rem] [&_b]:[color:var(--muted)] [&_b]:[font-weight:500]">{recentAi.map((event) => <div key={event.id}><strong>{event.operation}</strong><span>{event.model} · {event.status} · {event.totalTokens} tokens</span><b>{money(event.totalCost)} · {event.createdAt.toLocaleString()}</b></div>)}</div></section>
    </main>
  );
}
