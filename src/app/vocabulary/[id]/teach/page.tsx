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
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade">
        <Link href={"/vocabulary/" + word.id} className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-uv-fa2582d5d6e">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("word.lesson.back")}
        </Link>
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">
          {t("word.lesson.eyebrow", { level: course.targetLevel })}
        </p>
        <h1 className="learning-content" lang={targetLanguageCode} dir="ltr">
          {formatLexemeLabel(word)}
        </h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 line-height-1p65">{t("word.lesson.description")}</p>
      </section>

      <section className="lesson-grid grid grid-template-columns-1fr gap-3 uv-min700:grid-template-columns-repeat-2-minmax-0-1fr">
        <article className="panel lesson-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em in-h3:margin-0-0-6px in-h3:text-uv-fde89c2b680 in-h3:letter-spacing-0p02em-2 in-p-2:line-height-1p58 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("word.lesson.meaningStep")}</p>
              <h2>{t("word.lesson.meaningTitle")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>

          {visibleMeanings.map((translation) => (
            <p
              key={translation.kind + ":" + translation.language + ":" + translation.text}
              className="lesson-meaning learning-content margin-5px-0 text-uv-f24126b21bc line-height-1p5"
              lang={translation.language === "fa" ? "fa" : "en"}
              dir={translation.language === "fa" ? "rtl" : "ltr"}
            >
              {translation.text}
            </p>
          ))}
        </article>

        <article className="panel lesson-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em in-h3:margin-0-0-6px in-h3:text-uv-fde89c2b680 in-h3:letter-spacing-0p02em-2 in-p-2:line-height-1p58 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("word.lesson.patternStep")}</p>
              <h2>{t("word.lesson.patternTitle")}</h2>
            </div>
            <Brain size={20} />
          </div>

          {word.patterns.length ? (
            word.patterns.map((pattern) => (
              <div className="lesson-pattern padding-13px-0 border-1px-solid-border last:border-0-3 in-p-2:margin-6px-0-0" key={pattern.id}>
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

        <article className="panel lesson-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em in-h3:margin-0-0-6px in-h3:text-uv-fde89c2b680 in-h3:letter-spacing-0p02em-2 in-p-2:line-height-1p58 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("word.lesson.contextStep")}</p>
              <h2>{t("word.lesson.contextTitle")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>

          <div className="lesson-examples flex flex-col gap-2.5">
            {word.examples.slice(0, 4).map((example) => (
              <div className="lesson-example flex flex-col gap-1.25 padding-13px-14px border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface-raised in-span:text-uv-text-muted in-span:text-uv-f6c2d68ddb8 in-span:line-height-1p5" key={example.id}>
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

        <article className="panel lesson-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em in-h3:margin-0-0-6px in-h3:text-uv-fde89c2b680 in-h3:letter-spacing-0p02em-2 in-p-2:line-height-1p58 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("word.lesson.connectionsStep")}</p>
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
                  className="relation-chip min-h-12 min-w-27.5 inline-flex flex-col justify-center gap-0.75 padding-8px-12px border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface-raised in-span:font-semibold in-small:text-uv-text-muted in-small:text-uv-ff7862da171"
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

      <section className="lesson-production in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em flex flex-col gap-3 in-learning-card:max-w-none">
        <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
          <div>
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("word.lesson.produceStep")}</p>
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

      <section className="panel lesson-footer-actions border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em flex flex-col gap-4 in-p-2:mb-0 uv-min700:flex-row uv-min700:items-center uv-min700:justify-between rounded-uv-r6d27d54c6c">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("word.lesson.retainStep")}</p>
          <h2>{t("word.lesson.retainTitle")}</h2>
          <p className="muted text-uv-text-muted">{t("word.lesson.retainHelp")}</p>
        </div>
        <ScheduleReviewForm lexemeId={word.id} />
      </section>
    </main>
  );
}
