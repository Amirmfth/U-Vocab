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
  return <main className="page admin-page flex flex-col max-w-uv-fe3c59b9c7 gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
    <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade"><p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">BILLING STATE</p><h1>Subscriptions</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">Provider status is read-only here. Manual entitlement grants are the supported admin override.</p></section>
    <section className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>Provider subscriptions</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{subscriptions.map((s) => <div key={s.id}><strong>{s.user.email} · {s.plan}</strong><span>{s.provider} · {s.status}{s.cancelAtPeriodEnd ? " · cancel at end" : ""}</span><b>{s.currentPeriodStart.toISOString().slice(0,10)} → {s.currentPeriodEnd.toISOString().slice(0,10)}</b></div>)}</div></section>
    <section className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>Manual grants / overrides</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{grants.map((g) => <div key={g.id}><strong>{g.user.email} · {g.plan}</strong><span>{g.source} · {g.revokedAt ? "revoked" : "active"} · {g.endsAt?.toLocaleString() ?? "no expiry"}</span>{!g.revokedAt ? <form action={revokeEntitlementAction}><input type="hidden" name="grantId" value={g.id}/><ConfirmSubmitButton message="Revoke this manual entitlement?">Revoke</ConfirmSubmitButton></form> : <b>{g.reason ?? ""}</b>}</div>)}</div></section>
    <section className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>Recent quota usage</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{quotaUsage.map((q) => <div key={q.id}><strong>{q.user.email}</strong><span>{q.operationKey} · +{q.amount}</span><b>{q.createdAt.toLocaleString()} · resets {q.periodEnd.toLocaleString()}</b></div>)}</div></section>
  </main>;
}
