import { connection } from "next/server";
import { AddLexemeForm } from "./AddLexemeForm";
import { getCurrentUser } from "@/lib/current-user";

export default async function NewWord() {
  await connection();
  const user = await getCurrentUser();

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">AI-ASSISTED ENTRY</p>
        <h1>Add vocabulary</h1>
        <p className="page-description">
          Paste a German word, phrase, or text. Review the extracted lexical
          units before adding them to your vocabulary.
        </p>
      </section>

      <AddLexemeForm translationPreference={user.preferredTranslation} />
    </main>
  );
}
