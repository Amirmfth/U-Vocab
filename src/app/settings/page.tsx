import { getCurrentUser } from "@/lib/current-user";
import { updateTranslationPreference } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <main>
      <div className="hero">
        <p className="muted">PREFERENCES</p>
        <h1 style={{ fontSize: "3rem" }}>Settings</h1>
        <p className="muted">
          Choose which translations U-Vocab reveals during learning.
        </p>
      </div>

      <form action={updateTranslationPreference} className="card" style={{ maxWidth: 620 }}>
        <label htmlFor="translation">Translation language</label>
        <select
          id="translation"
          name="translation"
          defaultValue={user.preferredTranslation}
        >
          <option value="ENGLISH">English</option>
          <option value="PERSIAN">Persian</option>
          <option value="BOTH">English + Persian</option>
        </select>
        <button className="button" type="submit">Save preference</button>
      </form>
    </main>
  );
}
