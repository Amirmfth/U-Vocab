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
    <main className="page generated-reading-page">
      <section className="page-header compact reading-document-header">
        <Link href="/reading" className="back-link">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("reading.detail.back")}
        </Link>
        <div className="word-meta">
          <span className="badge">{reading.level}</span>
          <span className="badge">
            {t(lengthKeys[reading.length] ?? "reading.length.medium")}
          </span>
          {reading.completedAt ? (
            <span className="badge">
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
          <p className="page-description learning-content" dir="auto">
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
        <section className="panel reading-language-notes">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("reading.detail.notes")}</p>
              <h2>{t("reading.detail.grammarContext")}</h2>
            </div>
            <Brain size={19} />
          </div>
          <p className="muted">{t("reading.detail.notesHelp")}</p>
          <div className="question-list">
            {reading.grammarTargets.map((target) => (
              <details className="question-item" key={target.id}>
                <summary>
                  <span className="badge">
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
                  className="text-link"
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

      <section className="panel reading-language-summary">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("reading.detail.languageText")}</p>
            <h2>{t("reading.detail.encountered")}</h2>
          </div>
          <BookOpenCheck size={19} />
        </div>

        {reading.grammarTargets.length ? (
          <div className="reading-summary-group">
            <strong>{t("reading.detail.grammar")}</strong>
            <div className="relation-list">
              {reading.grammarTargets.map((target) => (
                <Link
                  className="relation-chip"
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
          <div className="reading-summary-group">
            <strong>{t("reading.detail.vocabulary")}</strong>
            <div className="relation-list">
              {reading.targets.map((target) => (
                <Link
                  className="relation-chip"
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

      <section className="panel story-summary">
        <h2 className="section-title">{t("reading.detail.summary")}</h2>
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
