import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, Brain, Network } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { visibleLexicalMeanings } from "@/lib/lexical-meaning";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { buildExercise } from "@/lib/exercises/build";
import { getServerTranslator } from "@/i18n/server";
import type { MessageKey } from "@/i18n/core";
import { PracticeForm } from "@/app/practice/PracticeForm";
import { ScheduleReviewForm } from "./ScheduleReviewForm";

const relationKeys: Record<string, MessageKey> = {
  WORD_FAMILY: "word.relation.word_family",
  SYNONYM: "word.relation.synonym",
  ANTONYM: "word.relation.antonym",
  DERIVED: "word.relation.derived",
  RELATED: "word.relation.related",
  COLLOCATION: "word.relation.collocation",
  PHRASE: "word.relation.phrase",
};

export default async function TeachWordPage({
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
  const { t } = await getServerTranslator(user);
  const targetLanguageCode = targetLanguageConfig(course.targetLanguage).code;

  const word = await db.lexeme.findFirst({
    where: {
      id,
      userStates: { some: { userCourseId: course.id } },
    },
    include: {
      translations: true,
      definitions: true,
      patterns: true,
      examples: { take: 6 },
      outgoing: {
        include: { target: { include: { translations: true } } },
        take: 8,
      },
      userStates: {
        where: { userId: user.id },
        take: 1,
      },
    },
  });

  if (!word || !word.userStates[0]) notFound();

  const item = word.userStates[0];
  const visibleMeanings = visibleLexicalMeanings(
    word,
    course.explanationLanguage,
  );

  const productionExercise = buildExercise(
    "REVERSE_RECALL",
    word,
    course.explanationLanguage,
  );

  return (
    <main className="page">
      <section className="page-header compact">
        <Link href={"/vocabulary/" + word.id} className="back-link">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("word.lesson.back")}
        </Link>
        <p className="eyebrow">
          {t("word.lesson.eyebrow", { level: course.targetLevel })}
        </p>
        <h1 className="learning-content" lang={targetLanguageCode} dir="ltr">
          {formatLexemeLabel(word)}
        </h1>
        <p className="page-description">{t("word.lesson.description")}</p>
      </section>

      <section className="lesson-grid">
        <article className="panel lesson-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("word.lesson.meaningStep")}</p>
              <h2>{t("word.lesson.meaningTitle")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>

          {visibleMeanings.map((translation) => (
            <p
              key={translation.id}
              className="lesson-meaning learning-content"
              lang={translation.language === "fa" ? "fa" : "en"}
              dir={translation.language === "fa" ? "rtl" : "ltr"}
            >
              {translation.text}
            </p>
          ))}
        </article>

        <article className="panel lesson-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("word.lesson.patternStep")}</p>
              <h2>{t("word.lesson.patternTitle")}</h2>
            </div>
            <Brain size={20} />
          </div>

          {word.patterns.length ? (
            word.patterns.map((pattern) => (
              <div className="lesson-pattern" key={pattern.id}>
                <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {pattern.pattern}
                </strong>
                {pattern.explanation ? (
                  <p className="muted learning-content" lang="en" dir="ltr">
                    {pattern.explanation}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="muted">{t("word.lesson.noPattern")}</p>
          )}
        </article>

        <article className="panel lesson-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("word.lesson.contextStep")}</p>
              <h2>{t("word.lesson.contextTitle")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>

          <div className="lesson-examples">
            {word.examples.slice(0, 4).map((example) => (
              <div className="lesson-example" key={example.id}>
                <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {example.targetText}
                </strong>
                {course.targetLanguage !== "ENGLISH" &&
                course.explanationLanguage !== "PERSIAN" &&
                example.english ? (
                  <span className="learning-content" lang="en" dir="ltr">
                    {example.english}
                  </span>
                ) : null}
                {course.explanationLanguage !== "ENGLISH" && example.persian ? (
                  <span className="learning-content" lang="fa" dir="rtl">
                    {example.persian}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="panel lesson-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("word.lesson.connectionsStep")}</p>
              <h2>{t("word.lesson.connectionsTitle")}</h2>
            </div>
            <Network size={20} />
          </div>

          {word.outgoing.length ? (
            <div className="relation-list">
              {word.outgoing.map((relation) => (
                <Link
                  key={relation.id}
                  href={"/vocabulary/" + relation.target.id}
                  className="relation-chip"
                >
                  <span className="learning-content" lang={targetLanguageCode} dir="ltr">
                    {relation.target.lemma}
                  </span>
                  <small>
                    {relationKeys[relation.type]
                      ? t(relationKeys[relation.type])
                      : relation.type.replaceAll("_", " ").toLowerCase()}
                  </small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">{t("word.lesson.noConnections")}</p>
          )}
        </article>
      </section>

      <section className="lesson-production">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("word.lesson.produceStep")}</p>
            <h2>{t("word.lesson.produceTitle")}</h2>
          </div>
          <Brain size={20} />
        </div>
        <PracticeForm
          exercises={[
            {
              id: `${item.id}:production`,
              userVocabularyId: item.id,
              lemma: word.lemma,
              exercise: productionExercise,
            },
          ]}
        />
      </section>

      <section className="panel lesson-footer-actions">
        <div>
          <p className="eyebrow">{t("word.lesson.retainStep")}</p>
          <h2>{t("word.lesson.retainTitle")}</h2>
          <p className="muted">{t("word.lesson.retainHelp")}</p>
        </div>
        <ScheduleReviewForm lexemeId={word.id} />
      </section>
    </main>
  );
}
