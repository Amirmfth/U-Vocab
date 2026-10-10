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
    <div className="admin-shell min-h-screen bg-linear-gradient-180deg-color-mix-in-srgb-surface-2-92pct-tra">
      <header className="admin-topbar flex justify-between gap-1rem items-center padding-p8rem-clamp-1rem-3vw-2rem border-1px-solid-border bg-uv-surface in-div:flex in-div:gap-p75rem in-div:items-center in-div:flex-wrap uv-max900:items-start">
        <div>
          <span className="admin-badge text-exact-p72rem font-extrabold letter-spacing-p08em padding-p28rem-p5rem border-1px-solid-currentcolor rounded-exact-999px">INTERNAL ADMIN</span>
          <strong>U-Vocab Operations</strong>
        </div>
        <div className="admin-identity text-exact-p8rem text-uv-c7dbd63a13e">
          <span>{admin.id}</span>
          <Link href="/vocabulary">Learner app</Link>
        </div>
      </header>
      <nav className="admin-nav flex gap-p25rem overflow-x-auto padding-p65rem-clamp-1rem-3vw-2rem border-1px-solid-border bg-uv-surface in-a:whitespace-nowrap in-a:padding-p5rem-p72rem in-a:rounded-exact-p55rem in-a:no-underline in-a:text-uv-text in-a-hover:bg-uv-c176590bb24" aria-label="Admin navigation">
        {items.map(([href, label]) => (
          <Link href={href} key={href}>{label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
