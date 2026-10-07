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
    <main className="page admin-page [display:flex] [flex-direction:column] [max-width:1480px] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
      <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]"><p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">ACCOUNTS</p><h1>Users</h1><p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">Search operational account state without opening learner-generated content.</p></section>
      <form className="panel admin-filter-bar [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [gap:.7rem] [align-items:end] [flex-wrap:wrap] [margin-bottom:1rem] [&_input]:[min-height:2.55rem] [&_select]:[min-height:2.55rem] [border-radius:18px]" method="get">
        <input name="q" defaultValue={query.q} placeholder="User ID or email" />
        <select name="plan" defaultValue={query.plan ?? ""}><option value="">All plans</option><option>FREE</option><option>PRO</option></select>
        <select name="status" defaultValue={query.status ?? ""}><option value="">All account states</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select>
        <input type="date" name="after" defaultValue={query.after ?? ""} />
        <button className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">Filter</button>
      </form>
      <section className="panel admin-table [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [overflow:hidden] max-[900px]:[overflow-x:auto] [border-radius:18px]">
        <div className="admin-table-head [display:grid] [grid-template-columns:minmax(220px,_1.5fr)_minmax(120px,_.7fr)_minmax(160px,_1fr)_minmax(160px,_1fr)_minmax(150px,_.8fr)] [gap:.75rem] [align-items:center] [padding:.8rem] [font-size:.75rem] [font-weight:800] [color:var(--muted)] [border-bottom:1px_solid_var(--border)] max-[900px]:[min-width:850px]"><span>User</span><span>Plan</span><span>State</span><span>Counts</span><span>Signup</span></div>
        {users.map((user) => {
          const pro = user.subscriptions.length > 0 || user.entitlementGrants.length > 0;
          return <Link className="admin-table-row [display:grid] [grid-template-columns:minmax(220px,_1.5fr)_minmax(120px,_.7fr)_minmax(160px,_1fr)_minmax(160px,_1fr)_minmax(150px,_.8fr)] [gap:.75rem] [align-items:center] [padding:.8rem] [color:inherit] [text-decoration:none] [border-bottom:1px_solid_var(--border)] [&:hover]:[background:var(--surface-2)] [&_>_span]:[display:grid] [&_>_span]:[gap:.15rem] [&_>_span]:[min-width:0] [&_small]:[color:var(--muted)] [&_small]:[overflow-wrap:anywhere] max-[900px]:[min-width:850px]" href={"/admin/users/" + user.id} key={user.id}>
            <span><strong>{user.email}</strong><small>{user.id} · {user.role}</small></span>
            <span>{pro ? "PRO" : "FREE"}</span>
            <span>{user.emailVerified ? "verified" : "unverified"} · {user._count.sessions} sessions</span>
            <span>{user._count.courses} courses · {user._count.vocabulary} words</span>
            <span>{user.createdAt.toISOString().slice(0,10)}</span>
          </Link>;
        })}
        {!users.length ? <p className="muted [color:var(--text-muted)]">No users match these filters.</p> : null}
      </section>
      <nav className="admin-pagination [display:grid] [grid-template-columns:1fr_auto_1fr] [align-items:center] [margin:1rem_0] [color:var(--muted)] [&_>_:last-child]:[text-align:right]">
        {page > 1 ? <Link href={{ pathname: "/admin/users", query: { ...query, page: page - 1 } }}>Previous</Link> : <span />}
        <span>Page {page} of {pages} · {total.toLocaleString()} users</span>
        {page < pages ? <Link href={{ pathname: "/admin/users", query: { ...query, page: page + 1 } }}>Next</Link> : <span />}
      </nav>
    </main>
  );
}
