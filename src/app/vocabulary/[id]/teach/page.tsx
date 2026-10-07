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
    <main className="page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
      <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]">
        <Link href={"/vocabulary/" + word.id} className="back-link [width:fit-content] [min-height:40px] [display:inline-flex] [align-items:center] [gap:7px] [color:var(--text-muted)] [font-size:0.82rem]">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("word.lesson.back")}
        </Link>
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">
          {t("word.lesson.eyebrow", { level: course.targetLevel })}
        </p>
        <h1 className="learning-content" lang={targetLanguageCode} dir="ltr">
          {formatLexemeLabel(word)}
        </h1>
        <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">{t("word.lesson.description")}</p>
      </section>

      <section className="lesson-grid [display:grid] [grid-template-columns:1fr] [gap:12px] min-[700px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
        <article className="panel lesson-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [&_h3]:[margin:0_0_6px] [&_h3]:[font-size:0.98rem] [&_h3]:[letter-spacing:-0.02em] [&_p]:[line-height:1.58] [border-radius:18px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.lesson.meaningStep")}</p>
              <h2>{t("word.lesson.meaningTitle")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>

          {visibleMeanings.map((translation) => (
            <p
              key={translation.kind + ":" + translation.language + ":" + translation.text}
              className="lesson-meaning learning-content [margin:5px_0] [font-size:1.1rem] [line-height:1.5]"
              lang={translation.language === "fa" ? "fa" : "en"}
              dir={translation.language === "fa" ? "rtl" : "ltr"}
            >
              {translation.text}
            </p>
          ))}
        </article>

        <article className="panel lesson-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [&_h3]:[margin:0_0_6px] [&_h3]:[font-size:0.98rem] [&_h3]:[letter-spacing:-0.02em] [&_p]:[line-height:1.58] [border-radius:18px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.lesson.patternStep")}</p>
              <h2>{t("word.lesson.patternTitle")}</h2>
            </div>
            <Brain size={20} />
          </div>

          {word.patterns.length ? (
            word.patterns.map((pattern) => (
              <div className="lesson-pattern [padding:13px_0] [border-bottom:1px_solid_var(--border)] [&:last-child]:[border-bottom:0] [&_p]:[margin:6px_0_0]" key={pattern.id}>
                <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {pattern.pattern}
                </strong>
                {pattern.explanation ? (
                  <p className="muted learning-content [color:var(--text-muted)]" lang="en" dir="ltr">
                    {pattern.explanation}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="muted [color:var(--text-muted)]">{t("word.lesson.noPattern")}</p>
          )}
        </article>

        <article className="panel lesson-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [&_h3]:[margin:0_0_6px] [&_h3]:[font-size:0.98rem] [&_h3]:[letter-spacing:-0.02em] [&_p]:[line-height:1.58] [border-radius:18px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.lesson.contextStep")}</p>
              <h2>{t("word.lesson.contextTitle")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>

          <div className="lesson-examples [display:flex] [flex-direction:column] [gap:10px]">
            {word.examples.slice(0, 4).map((example) => (
              <div className="lesson-example [display:flex] [flex-direction:column] [gap:5px] [padding:13px_14px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.8rem] [&_span]:[line-height:1.5]" key={example.id}>
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

        <article className="panel lesson-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [&_h3]:[margin:0_0_6px] [&_h3]:[font-size:0.98rem] [&_h3]:[letter-spacing:-0.02em] [&_p]:[line-height:1.58] [border-radius:18px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.lesson.connectionsStep")}</p>
              <h2>{t("word.lesson.connectionsTitle")}</h2>
            </div>
            <Network size={20} />
          </div>

          {word.outgoing.length ? (
            <div className="relation-list [display:flex] [flex-wrap:wrap] [gap:8px]">
              {word.outgoing.map((relation) => (
                <Link
                  key={relation.id}
                  href={"/vocabulary/" + relation.target.id}
                  className="relation-chip [min-height:48px] [min-width:110px] [display:inline-flex] [flex-direction:column] [justify-content:center] [gap:3px] [padding:8px_12px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [&_span]:[font-weight:600] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.66rem]"
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
            <p className="muted [color:var(--text-muted)]">{t("word.lesson.noConnections")}</p>
          )}
        </article>
      </section>

      <section className="lesson-production [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [display:flex] [flex-direction:column] [gap:12px] [&_.learning-card]:[max-width:none]">
        <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
          <div>
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.lesson.produceStep")}</p>
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

      <section className="panel lesson-footer-actions [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [display:flex] [flex-direction:column] [gap:16px] [&_p]:[margin-bottom:0] min-[700px]:[flex-direction:row] min-[700px]:[align-items:center] min-[700px]:[justify-content:space-between] [border-radius:18px]">
        <div>
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.lesson.retainStep")}</p>
          <h2>{t("word.lesson.retainTitle")}</h2>
          <p className="muted [color:var(--text-muted)]">{t("word.lesson.retainHelp")}</p>
        </div>
        <ScheduleReviewForm lexemeId={word.id} />
      </section>
    </main>
  );
}
