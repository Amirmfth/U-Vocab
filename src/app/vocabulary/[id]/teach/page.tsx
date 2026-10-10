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
        where: { userCourseId: course.id },
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
    <main className="page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade">
        <Link href={"/vocabulary/" + word.id} className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-uv-fa2582d5d6e">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("word.lesson.back")}
        </Link>
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">
          {t("word.lesson.eyebrow", { level: course.targetLevel })}
        </p>
        <h1 className="learning-content" lang={targetLanguageCode} dir="ltr">
          {formatLexemeLabel(word)}
        </h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{t("word.lesson.description")}</p>
      </section>

      <section className="lesson-grid grid uv-grid-template-columns-6a5c4d4d49 gap-3 uv-min700:uv-grid-template-columns-dd0b1a1848">
        <article className="panel lesson-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce uv-v55c53ce4b9:uv-margin-320a979a9f uv-v55c53ce4b9:text-uv-fde89c2b680 uv-v55c53ce4b9:uv-letter-spacing-235f37bdea uv-vb19eb067c9:uv-line-height-fe7a9b32f9 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.lesson.meaningStep")}</p>
              <h2>{t("word.lesson.meaningTitle")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>

          {visibleMeanings.map((translation) => (
            <p
              key={translation.kind + ":" + translation.language + ":" + translation.text}
              className="lesson-meaning learning-content uv-margin-397bb87e55 text-uv-f24126b21bc uv-line-height-aa8f289ebe"
              lang={translation.language === "fa" ? "fa" : "en"}
              dir={translation.language === "fa" ? "rtl" : "ltr"}
            >
              {translation.text}
            </p>
          ))}
        </article>

        <article className="panel lesson-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce uv-v55c53ce4b9:uv-margin-320a979a9f uv-v55c53ce4b9:text-uv-fde89c2b680 uv-v55c53ce4b9:uv-letter-spacing-235f37bdea uv-vb19eb067c9:uv-line-height-fe7a9b32f9 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.lesson.patternStep")}</p>
              <h2>{t("word.lesson.patternTitle")}</h2>
            </div>
            <Brain size={20} />
          </div>

          {word.patterns.length ? (
            word.patterns.map((pattern) => (
              <div className="lesson-pattern uv-padding-d53d738632 uv-border-bottom-8d7f82f403 last:uv-border-bottom-b6589fc6ab uv-vb19eb067c9:uv-margin-66a0389558" key={pattern.id}>
                <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {pattern.pattern}
                </strong>
                {pattern.explanation ? (
                  <p className="muted learning-content text-uv-text-muted" lang="en" dir="ltr">
                    {pattern.explanation}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="muted text-uv-text-muted">{t("word.lesson.noPattern")}</p>
          )}
        </article>

        <article className="panel lesson-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce uv-v55c53ce4b9:uv-margin-320a979a9f uv-v55c53ce4b9:text-uv-fde89c2b680 uv-v55c53ce4b9:uv-letter-spacing-235f37bdea uv-vb19eb067c9:uv-line-height-fe7a9b32f9 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.lesson.contextStep")}</p>
              <h2>{t("word.lesson.contextTitle")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>

          <div className="lesson-examples flex flex-col gap-2.5">
            {word.examples.slice(0, 4).map((example) => (
              <div className="lesson-example flex flex-col gap-1.25 uv-padding-e93fc48d3c uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f6c2d68ddb8 uv-v36c0309a03:uv-line-height-aa8f289ebe" key={example.id}>
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

        <article className="panel lesson-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce uv-v55c53ce4b9:uv-margin-320a979a9f uv-v55c53ce4b9:text-uv-fde89c2b680 uv-v55c53ce4b9:uv-letter-spacing-235f37bdea uv-vb19eb067c9:uv-line-height-fe7a9b32f9 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.lesson.connectionsStep")}</p>
              <h2>{t("word.lesson.connectionsTitle")}</h2>
            </div>
            <Network size={20} />
          </div>

          {word.outgoing.length ? (
            <div className="relation-list flex flex-wrap gap-2">
              {word.outgoing.map((relation) => (
                <Link
                  key={relation.id}
                  href={"/vocabulary/" + relation.target.id}
                  className="relation-chip min-h-12 min-w-27.5 inline-flex flex-col justify-center gap-0.75 uv-padding-e4accf4b2b uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised uv-v36c0309a03:font-semibold uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-ff7862da171"
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
            <p className="muted text-uv-text-muted">{t("word.lesson.noConnections")}</p>
          )}
        </article>
      </section>

      <section className="lesson-production uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce flex flex-col gap-3 uv-vb0069fed3b:max-w-none">
        <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
          <div>
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.lesson.produceStep")}</p>
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

      <section className="panel lesson-footer-actions uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce flex flex-col gap-4 uv-vb19eb067c9:mb-0 uv-min700:flex-row uv-min700:items-center uv-min700:justify-between rounded-uv-r6d27d54c6c">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.lesson.retainStep")}</p>
          <h2>{t("word.lesson.retainTitle")}</h2>
          <p className="muted text-uv-text-muted">{t("word.lesson.retainHelp")}</p>
        </div>
        <ScheduleReviewForm lexemeId={word.id} />
      </section>
    </main>
  );
}
