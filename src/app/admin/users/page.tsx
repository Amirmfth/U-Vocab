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
    <main className="page admin-page flex flex-col max-w-uv-fe3c59b9c7 gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem"><p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">ACCOUNTS</p><h1>Users</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">Search operational account state without opening learner-generated content.</p></section>
      <form className="panel admin-filter-bar border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex gap-p7rem items-end flex-wrap margin-bottom-1rem in-input:min-height-2p55rem in-select:min-height-2p55rem rounded-exact-18px" method="get">
        <input name="q" defaultValue={query.q} placeholder="User ID or email" />
        <select name="plan" defaultValue={query.plan ?? ""}><option value="">All plans</option><option>FREE</option><option>PRO</option></select>
        <select name="status" defaultValue={query.status ?? ""}><option value="">All account states</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select>
        <input type="date" name="after" defaultValue={query.after ?? ""} />
        <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">Filter</button>
      </form>
      <section className="panel admin-table border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 overflow-hidden uv-max900:overflow-x-auto rounded-exact-18px">
        <div className="admin-table-head grid grid-template-columns-minmax-220px-1p5fr-minmax-120px-p7fr-minm gap-p75rem items-center padding-p8rem text-exact-p75rem font-extrabold text-uv-c7dbd63a13e border-1px-solid-border uv-max900:min-w-uv-e4de6849ea"><span>User</span><span>Plan</span><span>State</span><span>Counts</span><span>Signup</span></div>
        {users.map((user) => {
          const pro = user.subscriptions.length > 0 || user.entitlementGrants.length > 0;
          return <Link className="admin-table-row grid grid-template-columns-minmax-220px-1p5fr-minmax-120px-p7fr-minm gap-p75rem items-center padding-p8rem text-inherit no-underline border-1px-solid-border hover:bg-uv-c176590bb24 in-span-2:grid in-span-2:gap-p15rem in-span-2:min-w-0 in-small:text-uv-c7dbd63a13e in-small:overflow-wrap-anywhere uv-max900:min-w-uv-e4de6849ea" href={"/admin/users/" + user.id} key={user.id}>
            <span><strong>{user.email}</strong><small>{user.id} · {user.role}</small></span>
            <span>{pro ? "PRO" : "FREE"}</span>
            <span>{user.emailVerified ? "verified" : "unverified"} · {user._count.sessions} sessions</span>
            <span>{user._count.courses} courses · {user._count.vocabulary} words</span>
            <span>{user.createdAt.toISOString().slice(0,10)}</span>
          </Link>;
        })}
        {!users.length ? <p className="muted text-uv-text-muted">No users match these filters.</p> : null}
      </section>
      <nav className="admin-pagination grid grid-template-columns-1fr-auto-1fr items-center margin-1rem-0 text-uv-c7dbd63a13e in-last-child:text-right">
        {page > 1 ? <Link href={{ pathname: "/admin/users", query: { ...query, page: page - 1 } }}>Previous</Link> : <span />}
        <span>Page {page} of {pages} · {total.toLocaleString()} users</span>
        {page < pages ? <Link href={{ pathname: "/admin/users", query: { ...query, page: page + 1 } }}>Next</Link> : <span />}
      </nav>
    </main>
  );
}
