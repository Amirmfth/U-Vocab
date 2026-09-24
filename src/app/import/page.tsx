import { getCurrentUser } from "@/lib/current-user";
import { ImportWorkspace } from "./ImportWorkspace";

export default async function ImportPage() {
  const user = await getCurrentUser();

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">IMPORT</p>
        <h1>Add vocabulary</h1>
        <p className="page-description">
          Preview, deduplicate, and enrich German vocabulary before it enters your library.
        </p>
      </section>

      <ImportWorkspace translationPreference={user.preferredTranslation} />
    </main>
  );
}
