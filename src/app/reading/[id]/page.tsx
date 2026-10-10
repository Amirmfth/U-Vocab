import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, Brain, BookOpenCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { isTranslationVisible } from "@/lib/translations";
import { getServerTranslator } from "@/i18n/server";
import { formatPercent } from "@/i18n/format";
import type { MessageKey } from "@/i18n/core";
import { ReadingAssessment } from "./ReadingAssessment";
import { ReadingText } from "./ReadingText";

type ReadingQuestion = {
  type: "COMPREHENSION" | "VOCABULARY" | "GRAMMAR";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  grammarConceptId: string | null;
};

const lengthKeys: Record<string, MessageKey> = {
  SHORT: "reading.length.short",
  MEDIUM: "reading.length.medium",
  LONG: "reading.length.long",
};

export default async function ReadingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user, course] = await Promise.all([
    params,
    getCurrentUser(),
    getCurrentCourse(),
  ]);
  const { locale, t } = await getServerTranslator(user);
  const reading = await db.story.findFirst({
    where: { id, userId: user.id, userCourseId: course.id },
    include: {
      targets: {
        orderBy: { position: "asc" },
        include: {
          lexeme: {
            include: { translations: true },
          },
        },
      },
      grammarTargets: {
        orderBy: { position: "asc" },
        include: { grammarConcept: true },
      },
    },
  });
  if (!reading) notFound();

  const questions = reading.questions as unknown as ReadingQuestion[];

  return (
    <main className="page generated-reading-page flex flex-col reading-measure-68ch gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact reading-document-header flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 max-w-uv-a9051779da in-h1:text-uv-fb9b4a66c9a">
        <Link href="/reading" className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-uv-fa2582d5d6e">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("reading.detail.back")}
        </Link>
        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{reading.level}</span>
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">
            {t(lengthKeys[reading.length] ?? "reading.length.medium")}
          </span>
          {reading.completedAt ? (
            <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">
              {t("reading.comprehension", { percent: formatPercent(
                  locale,
                  reading.comprehensionScore ?? 0,
                ) })}
            </span>
          ) : null}
        </div>
        <h1 className="learning-content" lang="de" dir="ltr">
          {reading.title}
        </h1>
        {reading.topic ? (
          <p className="page-description learning-content m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 line-height-1p65" dir="auto">
            {reading.topic}
          </p>
        ) : null}
      </section>

      <ReadingText
        content={reading.content}
        preference={course.explanationLanguage}
        targets={reading.targets.map((target) => ({
          id: target.lexeme.id,
          lemma: target.lexeme.lemma,
          article: target.lexeme.article,
          partOfSpeech: target.lexeme.partOfSpeech,
          cefrLevel: target.lexeme.cefrLevel,
          translations: target.lexeme.translations.map((translation) => ({
            language: translation.language,
            text: translation.text,
          })),
        }))}
      />

      {reading.grammarTargets.length ? (
        <section className="panel reading-language-notes border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 max-w-uv-a9051779da mx-auto in-blockquote:margin-10px-0 in-blockquote:ps-3 in-blockquote:border-2px-solid-border in-blockquote:text-uv-text-muted rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("reading.detail.notes")}</p>
              <h2>{t("reading.detail.grammarContext")}</h2>
            </div>
            <Brain size={19} />
          </div>
          <p className="muted text-uv-text-muted">{t("reading.detail.notesHelp")}</p>
          <div className="question-list flex flex-col gap-2">
            {reading.grammarTargets.map((target) => (
              <details className="question-item in-summary:flex in-summary:items-center in-summary:gap-2.25 in-summary:line-height-1p45 in-p-2:margin-12px-0-2px in-p-2:line-height-1p6" key={target.id}>
                <summary>
                  <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">
                    {target.grammarConcept.introducedAt}
                  </span>
                  <span className="learning-content" lang="en" dir="ltr">
                    {target.grammarConcept.title}
                  </span>
                </summary>
                {target.excerpt ? (
                  <blockquote className="learning-content" lang="de" dir="ltr">
                    {target.excerpt}
                  </blockquote>
                ) : null}
                {target.explanation ? (
                  <p className="learning-content" dir="auto">
                    {target.explanation}
                  </p>
                ) : null}
                <Link
                  className="text-link text-uv-primary-strong font-560 inline-flex items-center gap-1.5"
                  href={"/grammar/" + target.grammarConcept.slug}
                >
                  {t("reading.detail.learnGrammar")}
                </Link>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <ReadingAssessment readingId={reading.id} questions={questions} />

      <section className="panel reading-language-summary border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 max-w-uv-a9051779da mx-auto rounded-uv-r6d27d54c6c">
        <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
          <div>
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("reading.detail.languageText")}</p>
            <h2>{t("reading.detail.encountered")}</h2>
          </div>
          <BookOpenCheck size={19} />
        </div>

        {reading.grammarTargets.length ? (
          <div className="reading-summary-group grid gap-2.5 in-reading-summary-group:mt-4.5">
            <strong>{t("reading.detail.grammar")}</strong>
            <div className="relation-list flex flex-wrap gap-2">
              {reading.grammarTargets.map((target) => (
                <Link
                  className="relation-chip min-h-12 min-w-27.5 inline-flex flex-col justify-center gap-0.75 padding-8px-12px border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface-raised in-span:font-semibold in-small:text-uv-text-muted in-small:text-uv-ff7862da171"
                  href={"/grammar/" + target.grammarConcept.slug}
                  key={target.id}
                >
                  <span className="learning-content" lang="en" dir="ltr">
                    {target.grammarConcept.title}
                  </span>
                  <small>
                    {target.intentional
                      ? t("reading.detail.targeted")
                      : t("reading.detail.encounteredTag")}
                  </small>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {reading.targets.length ? (
          <div className="reading-summary-group grid gap-2.5 in-reading-summary-group:mt-4.5">
            <strong>{t("reading.detail.vocabulary")}</strong>
            <div className="relation-list flex flex-wrap gap-2">
              {reading.targets.map((target) => (
                <Link
                  className="relation-chip min-h-12 min-w-27.5 inline-flex flex-col justify-center gap-0.75 padding-8px-12px border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface-raised in-span:font-semibold in-small:text-uv-text-muted in-small:text-uv-ff7862da171"
                  href={"/vocabulary/" + target.lexeme.id}
                  key={target.id}
                >
                  <span className="learning-content" lang="de" dir="ltr">
                    {target.lexeme.lemma}
                  </span>
                  {target.lexeme.translations
                    .filter((translation) =>
                      isTranslationVisible(
                        course.explanationLanguage,
                        translation.language,
                      ),
                    )
                    .slice(0, 1)
                    .map((translation) => (
                      <small
                        key={translation.id}
                        className="learning-content"
                        lang={translation.language === "fa" ? "fa" : "en"}
                        dir={translation.language === "fa" ? "rtl" : "ltr"}
                      >
                        {translation.text}
                      </small>
                    ))}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel story-summary border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 in-p-2:line-height-1p65 rounded-uv-r6d27d54c6c">
        <h2 className="section-title margin-0-0-10px text-uv-f19feeb881c text-uv-text-soft letter-spacing-0p02em-2">{t("reading.detail.summary")}</h2>
        {course.explanationLanguage !== "PERSIAN" && reading.englishSummary ? (
          <p className="learning-content" lang="en" dir="ltr">
            {reading.englishSummary}
          </p>
        ) : null}
        {course.explanationLanguage !== "ENGLISH" && reading.persianSummary ? (
          <p className="learning-content" lang="fa" dir="rtl">
            {reading.persianSummary}
          </p>
        ) : null}
      </section>
    </main>
  );
}
