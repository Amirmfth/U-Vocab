import { getCurrentUser } from "@/lib/current-user";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">LEARNING PREFERENCES</p>
        <h1>Settings</h1>
        <p className="page-description">
          Choose the translations U-Vocab reveals and the German level used
          when OpenAI creates explanations, examples, and guided lessons.
        </p>
      </section>

      <SettingsForm
        preference={user.preferredTranslation}
        targetLevel={user.targetLevel}
      />
    </main>
  );
}
