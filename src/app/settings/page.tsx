import { getCurrentUser } from "@/lib/current-user";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <main className="page">
      <section className="page-header compact"><h1>Settings</h1></section>
      <SettingsForm preference={user.preferredTranslation} targetLevel={user.targetLevel} />
    </main>
  );
}
