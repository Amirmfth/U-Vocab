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
    <main className="page admin-page flex flex-col max-w-uv-fe3c59b9c7 gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem"><p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">USER DETAIL</p><h1>{user.email}</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">{user.id} · {user.role} · joined {user.createdAt.toLocaleString()}</p></section>
      <section className="admin-metric-grid grid grid-template-columns-repeat-auto-fit-minmax-210px-1fr gap-p85rem margin-bottom-1rem">
        <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-exact-1p45rem rounded-exact-18px"><span>Plan</span><strong>{plan.plan}</strong><small>{plan.source} · {plan.validUntil?.toLocaleString() ?? "no expiry"}</small></article>
        <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-exact-1p45rem rounded-exact-18px"><span>Vocabulary</span><strong>{user._count.vocabulary}</strong><small>{user._count.attempts} attempts · {user._count.mistakes} mistake records</small></article>
        <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-exact-1p45rem rounded-exact-18px"><span>AI · 7d</span><strong>{money(ai7._sum.totalCost)}</strong><small>{ai7._count._all} requests · {(ai7._sum.totalTokens ?? 0).toLocaleString()} tokens</small></article>
        <article className="panel admin-metric border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-p3rem in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-exact-1p45rem rounded-exact-18px"><span>AI · 30d</span><strong>{money(ai30._sum.totalCost)}</strong><small>{ai30._count._all} requests · {(ai30._sum.totalTokens ?? 0).toLocaleString()} tokens</small></article>
      </section>
      <section className="admin-two-column grid gap-1rem margin-1rem-0 grid-template-columns-repeat-2-minmax-0-1fr uv-max900:grid-template-columns-1fr">
        <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px"><h2>Courses</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-exact-p84rem in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-exact-p84rem in-b:text-uv-c7dbd63a13e in-b:font-medium">{user.courses.map((c) => <div key={c.id}><strong>{c.targetLanguage} · {c.currentLevel} → {c.targetLevel}</strong><span>{c.status} · {c.explanationLanguage}</span><b>{c._count.vocabulary} words · {c._count.attempts} attempts</b></div>)}</div></article>
        <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px"><h2>Quota consumption</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-exact-p84rem in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-exact-p84rem in-b:text-uv-c7dbd63a13e in-b:font-medium">{quotas.map((q) => <div key={q.key}><strong>{q.key}</strong><span>{q.used} / {q.limit}</span><b>resets {q.resetAt.toLocaleString()}</b></div>)}</div></article>
      </section>
      <section className="admin-two-column grid gap-1rem margin-1rem-0 grid-template-columns-repeat-2-minmax-0-1fr uv-max900:grid-template-columns-1fr">
        <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px">
          <h2>Entitlement override</h2>
          <form action={grantEntitlementAction} className="admin-stack-form flex gap-p7rem flex-wrap in-input:min-height-2p55rem items-stretch flex-col in-label:grid in-label:gap-p3rem in-label:text-exact-p8rem in-label:text-uv-c7dbd63a13e">
            <input type="hidden" name="userId" value={user.id} />
            <label>Ends at <input type="datetime-local" name="endsAt" required /></label>
            <label>Reason <input name="reason" maxLength={240} placeholder="Support / operational reason" /></label>
            <ConfirmSubmitButton message="Grant temporary Pro entitlement to this user?">Grant Pro</ConfirmSubmitButton>
          </form>
          <div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-exact-p84rem in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-exact-p84rem in-b:text-uv-c7dbd63a13e in-b:font-medium">
            {user.entitlementGrants.map((g) => <div key={g.id}><strong>{g.plan} · {g.source}</strong><span>{g.revokedAt ? "revoked" : "active"} · {g.endsAt?.toLocaleString() ?? "no expiry"}</span>{!g.revokedAt ? <form action={revokeEntitlementAction}><input type="hidden" name="grantId" value={g.id}/><ConfirmSubmitButton message="Revoke this entitlement grant?">Revoke</ConfirmSubmitButton></form> : <b>{g.reason ?? ""}</b>}</div>)}
          </div>
        </article>
        <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px">
          <h2>Account sessions</h2><p>{user._count.sessions} active session records.</p>
          <form action={revokeSessionsAction}><input type="hidden" name="userId" value={user.id}/><ConfirmSubmitButton message="Force sign-out on every device for this user?">Revoke all sessions</ConfirmSubmitButton></form>
          <h3>Subscriptions</h3><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-exact-p84rem in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-exact-p84rem in-b:text-uv-c7dbd63a13e in-b:font-medium">{user.subscriptions.map((s) => <div key={s.id}><strong>{s.plan} · {s.provider}</strong><span>{s.status}{s.cancelAtPeriodEnd ? " · cancels at period end" : ""}</span><b>{s.currentPeriodEnd.toLocaleString()}</b></div>)}</div>
        </article>
      </section>
      <section className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px"><h2>Recent AI operations</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-exact-p84rem in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-exact-p84rem in-b:text-uv-c7dbd63a13e in-b:font-medium">{recentAi.map((event) => <div key={event.id}><strong>{event.operation}</strong><span>{event.model} · {event.status} · {event.totalTokens} tokens</span><b>{money(event.totalCost)} · {event.createdAt.toLocaleString()}</b></div>)}</div></section>
    </main>
  );
}
