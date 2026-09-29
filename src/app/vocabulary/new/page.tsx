import { connection } from "next/server";
import { AddLexemeForm } from "./AddLexemeForm";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { getServerTranslator } from "@/i18n/server";

export default async function NewWord() {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const { t } = await getServerTranslator(user);

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">{t("vocab.add.eyebrow")}</p>
        <h1>{t("vocab.add.title")}</h1>
        <p className="page-description">{t("vocab.add.description")}</p>
      </section>

      <AddLexemeForm translationPreference={course.explanationLanguage} />
    </main>
  );
}
