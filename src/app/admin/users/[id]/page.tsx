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
      <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade"><p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">USER DETAIL</p><h1>{user.email}</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{user.id} · {user.role} · joined {user.createdAt.toLocaleString()}</p></section>
      <section className="admin-metric-grid grid uv-grid-template-columns-2c434107cb uv-gap-56bd79d94e uv-margin-bottom-19feeb881c">
        <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Plan</span><strong>{plan.plan}</strong><small>{plan.source} · {plan.validUntil?.toLocaleString() ?? "no expiry"}</small></article>
        <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>Vocabulary</span><strong>{user._count.vocabulary}</strong><small>{user._count.attempts} attempts · {user._count.mistakes} mistake records</small></article>
        <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>AI · 7d</span><strong>{money(ai7._sum.totalCost)}</strong><small>{ai7._count._all} requests · {(ai7._sum.totalTokens ?? 0).toLocaleString()} tokens</small></article>
        <article className="panel admin-metric uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-b0633a4dbe uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fab62110780 rounded-uv-r6d27d54c6c"><span>AI · 30d</span><strong>{money(ai30._sum.totalCost)}</strong><small>{ai30._count._all} requests · {(ai30._sum.totalTokens ?? 0).toLocaleString()} tokens</small></article>
      </section>
      <section className="admin-two-column grid uv-gap-19feeb881c uv-margin-c3f2ebc6d1 uv-grid-template-columns-dd0b1a1848 uv-max900:uv-grid-template-columns-6a5c4d4d49">
        <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>Courses</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{user.courses.map((c) => <div key={c.id}><strong>{c.targetLanguage} · {c.currentLevel} → {c.targetLevel}</strong><span>{c.status} · {c.explanationLanguage}</span><b>{c._count.vocabulary} words · {c._count.attempts} attempts</b></div>)}</div></article>
        <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>Quota consumption</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{quotas.map((q) => <div key={q.key}><strong>{q.key}</strong><span>{q.used} / {q.limit}</span><b>resets {q.resetAt.toLocaleString()}</b></div>)}</div></article>
      </section>
      <section className="admin-two-column grid uv-gap-19feeb881c uv-margin-c3f2ebc6d1 uv-grid-template-columns-dd0b1a1848 uv-max900:uv-grid-template-columns-6a5c4d4d49">
        <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
          <h2>Entitlement override</h2>
          <form action={grantEntitlementAction} className="admin-stack-form flex uv-gap-f73364d9bf flex-wrap uv-vcf5ce320fa:uv-min-height-e005337472 items-stretch flex-col uv-v586b3820a5:grid uv-v586b3820a5:uv-gap-b0633a4dbe uv-v586b3820a5:text-uv-fdbd07cbfaa uv-v586b3820a5:text-uv-c7dbd63a13e">
            <input type="hidden" name="userId" value={user.id} />
            <label>Ends at <input type="datetime-local" name="endsAt" required /></label>
            <label>Reason <input name="reason" maxLength={240} placeholder="Support / operational reason" /></label>
            <ConfirmSubmitButton message="Grant temporary Pro entitlement to this user?">Grant Pro</ConfirmSubmitButton>
          </form>
          <div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">
            {user.entitlementGrants.map((g) => <div key={g.id}><strong>{g.plan} · {g.source}</strong><span>{g.revokedAt ? "revoked" : "active"} · {g.endsAt?.toLocaleString() ?? "no expiry"}</span>{!g.revokedAt ? <form action={revokeEntitlementAction}><input type="hidden" name="grantId" value={g.id}/><ConfirmSubmitButton message="Revoke this entitlement grant?">Revoke</ConfirmSubmitButton></form> : <b>{g.reason ?? ""}</b>}</div>)}
          </div>
        </article>
        <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
          <h2>Account sessions</h2><p>{user._count.sessions} active session records.</p>
          <form action={revokeSessionsAction}><input type="hidden" name="userId" value={user.id}/><ConfirmSubmitButton message="Force sign-out on every device for this user?">Revoke all sessions</ConfirmSubmitButton></form>
          <h3>Subscriptions</h3><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{user.subscriptions.map((s) => <div key={s.id}><strong>{s.plan} · {s.provider}</strong><span>{s.status}{s.cancelAtPeriodEnd ? " · cancels at period end" : ""}</span><b>{s.currentPeriodEnd.toLocaleString()}</b></div>)}</div>
        </article>
      </section>
      <section className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>Recent AI operations</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{recentAi.map((event) => <div key={event.id}><strong>{event.operation}</strong><span>{event.model} · {event.status} · {event.totalTokens} tokens</span><b>{money(event.totalCost)} · {event.createdAt.toLocaleString()}</b></div>)}</div></section>
    </main>
  );
}
