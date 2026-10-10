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
    <div className="admin-shell min-h-screen uv-background-83ee7d7fb6">
      <header className="admin-topbar flex justify-between uv-gap-19feeb881c items-center uv-padding-0cb8da7219 uv-border-bottom-8d7f82f403 bg-uv-surface uv-vcbb57f4d35:flex uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:flex-wrap uv-max900:items-start">
        <div>
          <span className="admin-badge text-uv-fbcf5b95460 font-extrabold uv-letter-spacing-5d39dc5096 uv-padding-745292382e uv-border-92bc626cad rounded-uv-red9ab892c5">INTERNAL ADMIN</span>
          <strong>U-Vocab Operations</strong>
        </div>
        <div className="admin-identity text-uv-fdbd07cbfaa text-uv-c7dbd63a13e">
          <span>{admin.id}</span>
          <Link href="/vocabulary">Learner app</Link>
        </div>
      </header>
      <nav className="admin-nav flex uv-gap-366915d309 overflow-x-auto uv-padding-d58d521e93 uv-border-bottom-8d7f82f403 bg-uv-surface uv-v99777dc5b4:whitespace-nowrap uv-v99777dc5b4:uv-padding-a131e77e71 uv-v99777dc5b4:rounded-uv-ra69a0b3654 uv-v99777dc5b4:no-underline uv-v99777dc5b4:text-uv-text uv-v6a6efdfb37:bg-uv-c176590bb24" aria-label="Admin navigation">
        {items.map(([href, label]) => (
          <Link href={href} key={href}>{label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
