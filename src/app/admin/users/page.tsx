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
      <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade"><p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">ACCOUNTS</p><h1>Users</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">Search operational account state without opening learner-generated content.</p></section>
      <form className="panel admin-filter-bar uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex uv-gap-f73364d9bf items-end flex-wrap uv-margin-bottom-19feeb881c uv-vcf5ce320fa:uv-min-height-e005337472 uv-vfc0df1ac56:uv-min-height-e005337472 rounded-uv-r6d27d54c6c" method="get">
        <input name="q" defaultValue={query.q} placeholder="User ID or email" />
        <select name="plan" defaultValue={query.plan ?? ""}><option value="">All plans</option><option>FREE</option><option>PRO</option></select>
        <select name="status" defaultValue={query.status ?? ""}><option value="">All account states</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select>
        <input type="date" name="after" defaultValue={query.after ?? ""} />
        <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">Filter</button>
      </form>
      <section className="panel admin-table uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 overflow-hidden uv-max900:overflow-x-auto rounded-uv-r6d27d54c6c">
        <div className="admin-table-head grid uv-grid-template-columns-efe4e3d144 uv-gap-60ac4cf407 items-center uv-padding-dbd07cbfaa text-uv-f60ac4cf407 font-extrabold text-uv-c7dbd63a13e uv-border-bottom-8d7f82f403 uv-max900:min-w-uv-e4de6849ea"><span>User</span><span>Plan</span><span>State</span><span>Counts</span><span>Signup</span></div>
        {users.map((user) => {
          const pro = user.subscriptions.length > 0 || user.entitlementGrants.length > 0;
          return <Link className="admin-table-row grid uv-grid-template-columns-efe4e3d144 uv-gap-60ac4cf407 items-center uv-padding-dbd07cbfaa text-inherit no-underline uv-border-bottom-8d7f82f403 hover:bg-uv-c176590bb24 uv-v22810335d8:grid uv-v22810335d8:uv-gap-bc493dc595 uv-v22810335d8:min-w-0 uv-v982220ddd5:text-uv-c7dbd63a13e uv-v982220ddd5:uv-overflow-wrap-112c2a063a uv-max900:min-w-uv-e4de6849ea" href={"/admin/users/" + user.id} key={user.id}>
            <span><strong>{user.email}</strong><small>{user.id} · {user.role}</small></span>
            <span>{pro ? "PRO" : "FREE"}</span>
            <span>{user.emailVerified ? "verified" : "unverified"} · {user._count.sessions} sessions</span>
            <span>{user._count.courses} courses · {user._count.vocabulary} words</span>
            <span>{user.createdAt.toISOString().slice(0,10)}</span>
          </Link>;
        })}
        {!users.length ? <p className="muted text-uv-text-muted">No users match these filters.</p> : null}
      </section>
      <nav className="admin-pagination grid uv-grid-template-columns-e4c3efd568 items-center uv-margin-c3f2ebc6d1 text-uv-c7dbd63a13e uv-v87e7c148d8:text-right">
        {page > 1 ? <Link href={{ pathname: "/admin/users", query: { ...query, page: page - 1 } }}>Previous</Link> : <span />}
        <span>Page {page} of {pages} · {total.toLocaleString()} users</span>
        {page < pages ? <Link href={{ pathname: "/admin/users", query: { ...query, page: page + 1 } }}>Next</Link> : <span />}
      </nav>
    </main>
  );
}
