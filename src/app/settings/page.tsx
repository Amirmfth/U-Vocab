import { connection } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { SettingsForm } from "./SettingsForm";


export default async function SettingsPage() {
  await connection();
  const user = await getCurrentUser();

  return (
    <main className="page">
      <section className="page-header compact"><h1>Settings</h1></section>
      <SettingsForm preference={user.preferredTranslation} targetLevel={user.targetLevel} />
    </main>
  );
}
