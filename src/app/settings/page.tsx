import { connection } from "next/server";
import Link from "next/link";
import { BarChart3, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { SettingsForm } from "./SettingsForm";
import { logout } from "./auth-actions";

export default async function SettingsPage() {
  await connection();
  const user = await getCurrentUser();

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">ACCOUNT</p>
        <h1>Settings</h1>
      </section>
      <SettingsForm preference={user.preferredTranslation} targetLevel={user.targetLevel} />
      <section className="panel account-links">
        <div>
          <strong>AI operations</strong>
          <span className="muted">Review model usage, tokens, latency, and recorded cost.</span>
        </div>
        <Link href="/usage" className="button button-secondary"><BarChart3 size={17} /> AI Usage</Link>
      </section>
      <section className="panel account-links">
        <div>
          <strong>Private session</strong>
          <span className="muted">Clear this browser's signed U-Vocab session.</span>
        </div>
        <form action={logout}>
          <button className="button button-secondary" type="submit"><LogOut size={17} /> Sign out</button>
        </form>
      </section>
    </main>
  );
}
