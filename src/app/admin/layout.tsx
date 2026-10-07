import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";

const items = [
  ["/admin", "Dashboard"],
  ["/admin/users", "Users"],
  ["/admin/usage", "AI Usage"],
  ["/admin/lexicon", "Lexicon"],
  ["/admin/subscriptions", "Subscriptions"],
  ["/admin/system", "System"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="admin-shell [min-height:100vh] [background:linear-gradient(180deg,_color-mix(in_srgb,_var(--surface-2)_92%,_transparent),_transparent_28rem),_var(--background)]">
      <header className="admin-topbar [display:flex] [justify-content:space-between] [gap:1rem] [align-items:center] [padding:.8rem_clamp(1rem,_3vw,_2rem)] [border-bottom:1px_solid_var(--border)] [background:var(--surface)] [&_>_div]:[display:flex] [&_>_div]:[gap:.75rem] [&_>_div]:[align-items:center] [&_>_div]:[flex-wrap:wrap] max-[900px]:[align-items:flex-start]">
        <div>
          <span className="admin-badge [font-size:.72rem] [font-weight:800] [letter-spacing:.08em] [padding:.28rem_.5rem] [border:1px_solid_currentColor] [border-radius:999px]">INTERNAL ADMIN</span>
          <strong>U-Vocab Operations</strong>
        </div>
        <div className="admin-identity [font-size:.8rem] [color:var(--muted)]">
          <span>{admin.id}</span>
          <Link href="/vocabulary">Learner app</Link>
        </div>
      </header>
      <nav className="admin-nav [display:flex] [gap:.25rem] [overflow-x:auto] [padding:.65rem_clamp(1rem,_3vw,_2rem)] [border-bottom:1px_solid_var(--border)] [background:var(--surface)] [&_a]:[white-space:nowrap] [&_a]:[padding:.5rem_.72rem] [&_a]:[border-radius:.55rem] [&_a]:[text-decoration:none] [&_a]:[color:var(--text)] [&_a:hover]:[background:var(--surface-2)]" aria-label="Admin navigation">
        {items.map(([href, label]) => (
          <Link href={href} key={href}>{label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
