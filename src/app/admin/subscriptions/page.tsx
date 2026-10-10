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
    <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade"><p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">BILLING STATE</p><h1>Subscriptions</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 line-height-1p65">Provider status is read-only here. Manual entitlement grants are the supported admin override.</p></section>
    <section className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c"><h2>Provider subscriptions</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-uv-f6b4e408307 in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-uv-f6b4e408307 in-b:text-uv-c7dbd63a13e in-b:font-medium">{subscriptions.map((s) => <div key={s.id}><strong>{s.user.email} · {s.plan}</strong><span>{s.provider} · {s.status}{s.cancelAtPeriodEnd ? " · cancel at end" : ""}</span><b>{s.currentPeriodStart.toISOString().slice(0,10)} → {s.currentPeriodEnd.toISOString().slice(0,10)}</b></div>)}</div></section>
    <section className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c"><h2>Manual grants / overrides</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-uv-f6b4e408307 in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-uv-f6b4e408307 in-b:text-uv-c7dbd63a13e in-b:font-medium">{grants.map((g) => <div key={g.id}><strong>{g.user.email} · {g.plan}</strong><span>{g.source} · {g.revokedAt ? "revoked" : "active"} · {g.endsAt?.toLocaleString() ?? "no expiry"}</span>{!g.revokedAt ? <form action={revokeEntitlementAction}><input type="hidden" name="grantId" value={g.id}/><ConfirmSubmitButton message="Revoke this manual entitlement?">Revoke</ConfirmSubmitButton></form> : <b>{g.reason ?? ""}</b>}</div>)}</div></section>
    <section className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c"><h2>Recent quota usage</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-uv-f6b4e408307 in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-uv-f6b4e408307 in-b:text-uv-c7dbd63a13e in-b:font-medium">{quotaUsage.map((q) => <div key={q.id}><strong>{q.user.email}</strong><span>{q.operationKey} · +{q.amount}</span><b>{q.createdAt.toLocaleString()} · resets {q.periodEnd.toLocaleString()}</b></div>)}</div></section>
  </main>;
}
