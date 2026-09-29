import { connection } from "next/server";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { SettingsForm } from "./SettingsForm";
import { SignOutButton } from "./SignOutButton";

export default async function SettingsPage() {
  await connection();
  const user = await getCurrentUser();

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">ACCOUNT</p>
        <h1>Settings</h1>
      </section>
      <SettingsForm
        preference={user.preferredTranslation}
        currentLevel={user.currentLevel}
        targetLevel={user.targetLevel}
      />
      <section className="panel account-links">
        <div>
          <strong>AI operations</strong>
          <span className="muted">Review model usage, tokens, latency, and recorded cost.</span>
        </div>
        <Link href="/usage" className="button button-secondary"><BarChart3 size={17} /> AI Usage</Link>
      </section>
      <section className="panel account-links">
        <div>
          <strong>Account session</strong>
          <span className="muted">Sign out of this browser. Your learning data stays attached to your account.</span>
        </div>
        <SignOutButton />
      </section>
    </main>
  );
}
