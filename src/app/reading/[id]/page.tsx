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
    <main className="page generated-reading-page flex flex-col uv---reading-measure-51f5a1cba8 gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact reading-document-header flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 max-w-uv-a9051779da uv-v3bccf64584:text-uv-fb9b4a66c9a">
        <Link href="/reading" className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-uv-fa2582d5d6e">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("reading.detail.back")}
        </Link>
        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{reading.level}</span>
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">
            {t(lengthKeys[reading.length] ?? "reading.length.medium")}
          </span>
          {reading.completedAt ? (
            <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">
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
          <p className="page-description learning-content m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a" dir="auto">
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
        <section className="panel reading-language-notes uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 max-w-uv-a9051779da mx-auto uv-v40f68432a8:uv-margin-10ff753f5f uv-v40f68432a8:ps-3 uv-v40f68432a8:uv-border-inline-start-c419f9412a uv-v40f68432a8:text-uv-text-muted rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("reading.detail.notes")}</p>
              <h2>{t("reading.detail.grammarContext")}</h2>
            </div>
            <Brain size={19} />
          </div>
          <p className="muted text-uv-text-muted">{t("reading.detail.notesHelp")}</p>
          <div className="question-list flex flex-col gap-2">
            {reading.grammarTargets.map((target) => (
              <details className="question-item uv-vaa46806d56:flex uv-vaa46806d56:items-center uv-vaa46806d56:gap-2.25 uv-vaa46806d56:uv-line-height-2792cf2449 uv-vb19eb067c9:uv-margin-41866770f5 uv-vb19eb067c9:uv-line-height-4693695d02" key={target.id}>
                <summary>
                  <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">
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
                  className="text-link text-uv-primary-strong uv-weight-560 inline-flex items-center gap-1.5"
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

      <section className="panel reading-language-summary uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 max-w-uv-a9051779da mx-auto rounded-uv-r6d27d54c6c">
        <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
          <div>
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("reading.detail.languageText")}</p>
            <h2>{t("reading.detail.encountered")}</h2>
          </div>
          <BookOpenCheck size={19} />
        </div>

        {reading.grammarTargets.length ? (
          <div className="reading-summary-group grid gap-2.5 uv-vd1ee2fd995:mt-4.5">
            <strong>{t("reading.detail.grammar")}</strong>
            <div className="relation-list flex flex-wrap gap-2">
              {reading.grammarTargets.map((target) => (
                <Link
                  className="relation-chip min-h-12 min-w-27.5 inline-flex flex-col justify-center gap-0.75 uv-padding-e4accf4b2b uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised uv-v36c0309a03:font-semibold uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-ff7862da171"
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
          <div className="reading-summary-group grid gap-2.5 uv-vd1ee2fd995:mt-4.5">
            <strong>{t("reading.detail.vocabulary")}</strong>
            <div className="relation-list flex flex-wrap gap-2">
              {reading.targets.map((target) => (
                <Link
                  className="relation-chip min-h-12 min-w-27.5 inline-flex flex-col justify-center gap-0.75 uv-padding-e4accf4b2b uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised uv-v36c0309a03:font-semibold uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-ff7862da171"
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

      <section className="panel story-summary uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 uv-vb19eb067c9:uv-line-height-cf9a155f4a rounded-uv-r6d27d54c6c">
        <h2 className="section-title uv-margin-83bba30fc1 text-uv-f19feeb881c text-uv-text-soft uv-letter-spacing-235f37bdea">{t("reading.detail.summary")}</h2>
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
