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
    <div className="admin-shell">
      <header className="admin-topbar">
        <div>
          <span className="admin-badge">INTERNAL ADMIN</span>
          <strong>U-Vocab Operations</strong>
        </div>
        <div className="admin-identity">
          <span>{admin.id}</span>
          <Link href="/vocabulary">Learner app</Link>
        </div>
      </header>
      <nav className="admin-nav" aria-label="Admin navigation">
        {items.map(([href, label]) => (
          <Link href={href} key={href}>{label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
