import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

const PAGE_SIZE = 25;
function pageNumber(value: string | undefined) {
  const n = Number(value ?? "1");
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; status?: string; after?: string; page?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const page = pageNumber(query.page);
  const q = query.q?.trim();
  const now = new Date();
  const after = query.after && !Number.isNaN(Date.parse(query.after)) ? new Date(query.after) : null;
  const proWhere = {
    OR: [
      { subscriptions: { some: { plan: "PRO" as const, status: { in: ["ACTIVE" as const, "GRACE" as const] }, currentPeriodEnd: { gt: now } } } },
      { entitlementGrants: { some: { plan: "PRO" as const, revokedAt: null, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] } } },
    ],
  };
  const where = {
    AND: [
      q ? { OR: [{ id: { contains: q } }, { email: { contains: q, mode: "insensitive" as const } }] } : {},
      query.status === "verified" ? { emailVerified: true } : query.status === "unverified" ? { emailVerified: false } : {},
      after ? { createdAt: { gte: after } } : {},
      query.plan === "PRO" ? proWhere : query.plan === "FREE" ? { NOT: proWhere } : {},
    ],
  };

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select: {
        id: true, email: true, role: true, emailVerified: true, createdAt: true,
        _count: { select: { courses: true, vocabulary: true, sessions: true } },
        subscriptions: {
          where: { status: { in: ["ACTIVE","GRACE"] }, currentPeriodEnd: { gt: now } },
          select: { id: true },
          take: 1,
        },
        entitlementGrants: {
          where: { revokedAt: null, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="page admin-page">
      <section className="page-header compact"><p className="eyebrow">ACCOUNTS</p><h1>Users</h1><p className="page-description">Search operational account state without opening learner-generated content.</p></section>
      <form className="panel admin-filter-bar" method="get">
        <input name="q" defaultValue={query.q} placeholder="User ID or email" />
        <select name="plan" defaultValue={query.plan ?? ""}><option value="">All plans</option><option>FREE</option><option>PRO</option></select>
        <select name="status" defaultValue={query.status ?? ""}><option value="">All account states</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select>
        <input type="date" name="after" defaultValue={query.after ?? ""} />
        <button className="button button-primary">Filter</button>
      </form>
      <section className="panel admin-table">
        <div className="admin-table-head"><span>User</span><span>Plan</span><span>State</span><span>Counts</span><span>Signup</span></div>
        {users.map((user) => {
          const pro = user.subscriptions.length > 0 || user.entitlementGrants.length > 0;
          return <Link className="admin-table-row" href={"/admin/users/" + user.id} key={user.id}>
            <span><strong>{user.email}</strong><small>{user.id} · {user.role}</small></span>
            <span>{pro ? "PRO" : "FREE"}</span>
            <span>{user.emailVerified ? "verified" : "unverified"} · {user._count.sessions} sessions</span>
            <span>{user._count.courses} courses · {user._count.vocabulary} words</span>
            <span>{user.createdAt.toISOString().slice(0,10)}</span>
          </Link>;
        })}
        {!users.length ? <p className="muted">No users match these filters.</p> : null}
      </section>
      <nav className="admin-pagination">
        {page > 1 ? <Link href={{ pathname: "/admin/users", query: { ...query, page: page - 1 } }}>Previous</Link> : <span />}
        <span>Page {page} of {pages} · {total.toLocaleString()} users</span>
        {page < pages ? <Link href={{ pathname: "/admin/users", query: { ...query, page: page + 1 } }}>Next</Link> : <span />}
      </nav>
    </main>
  );
}
