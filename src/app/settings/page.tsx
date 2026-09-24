import { getCurrentUser } from "@/lib/current-user";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">PREFERENCES</p>
        <h1>Settings</h1>
        <p className="page-description">
          Choose which translation language U-Vocab reveals throughout
          learning, review, and practice.
        </p>
      </section>

      <SettingsForm preference={user.preferredTranslation} />
    </main>
  );
}
