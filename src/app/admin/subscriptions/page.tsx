import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { ConfirmSubmitButton } from "../ConfirmSubmitButton";
import { revokeEntitlementAction } from "../actions";

const PAGE_SIZE = 30;

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const q = await searchParams;
  const page = Math.max(1, Number.parseInt(q.page ?? "1", 10) || 1);
  const [subscriptions, grants] = await Promise.all([
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
  ]);
  return <main className="page admin-page">
    <section className="page-header compact"><p className="eyebrow">BILLING STATE</p><h1>Subscriptions</h1><p className="page-description">Provider status is read-only here. Manual entitlement grants are the supported admin override.</p></section>
    <section className="panel"><h2>Provider subscriptions</h2><div className="admin-table-list">{subscriptions.map((s) => <div key={s.id}><strong>{s.user.email} · {s.plan}</strong><span>{s.provider} · {s.status}{s.cancelAtPeriodEnd ? " · cancel at end" : ""}</span><b>{s.currentPeriodStart.toISOString().slice(0,10)} → {s.currentPeriodEnd.toISOString().slice(0,10)}</b></div>)}</div></section>
    <section className="panel"><h2>Manual grants / overrides</h2><div className="admin-table-list">{grants.map((g) => <div key={g.id}><strong>{g.user.email} · {g.plan}</strong><span>{g.source} · {g.revokedAt ? "revoked" : "active"} · {g.endsAt?.toLocaleString() ?? "no expiry"}</span>{!g.revokedAt ? <form action={revokeEntitlementAction}><input type="hidden" name="grantId" value={g.id}/><ConfirmSubmitButton message="Revoke this manual entitlement?">Revoke</ConfirmSubmitButton></form> : <b>{g.reason ?? ""}</b>}</div>)}</div></section>
  </main>;
}
