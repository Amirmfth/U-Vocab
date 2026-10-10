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
    <main className="page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("vocab.add.eyebrow")}</p>
        <h1>{t("vocab.add.title")}</h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">{t("vocab.add.description")}</p>
      </section>

      <AddLexemeForm translationPreference={course.explanationLanguage} />
    </main>
  );
}
