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
    <main className="page generated-reading-page [display:flex] [flex-direction:column] [--reading-measure:68ch] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
      <section className="page-header compact reading-document-header [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [max-width:860px] [&_h1]:[font-size:clamp(2.25rem,_9vw,_4.4rem)]">
        <Link href="/reading" className="back-link [width:fit-content] [min-height:40px] [display:inline-flex] [align-items:center] [gap:7px] [color:var(--text-muted)] [font-size:0.82rem]">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("reading.detail.back")}
        </Link>
        <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{reading.level}</span>
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
            {t(lengthKeys[reading.length] ?? "reading.length.medium")}
          </span>
          {reading.completedAt ? (
            <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
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
          <p className="page-description learning-content [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]" dir="auto">
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
        <section className="panel reading-language-notes [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [max-width:860px] [margin-inline:auto] [&_blockquote]:[margin:10px_0] [&_blockquote]:[padding-inline-start:12px] [&_blockquote]:[border-inline-start:2px_solid_var(--border)] [&_blockquote]:[color:var(--text-muted)] [border-radius:18px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("reading.detail.notes")}</p>
              <h2>{t("reading.detail.grammarContext")}</h2>
            </div>
            <Brain size={19} />
          </div>
          <p className="muted [color:var(--text-muted)]">{t("reading.detail.notesHelp")}</p>
          <div className="question-list [display:flex] [flex-direction:column] [gap:8px]">
            {reading.grammarTargets.map((target) => (
              <details className="question-item [&_summary]:[display:flex] [&_summary]:[align-items:center] [&_summary]:[gap:9px] [&_summary]:[line-height:1.45] [&_p]:[margin:12px_0_2px] [&_p]:[line-height:1.6]" key={target.id}>
                <summary>
                  <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
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
                  className="text-link [color:var(--primary-strong)] [font-weight:560] [display:inline-flex] [align-items:center] [gap:6px]"
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

      <section className="panel reading-language-summary [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [max-width:860px] [margin-inline:auto] [border-radius:18px]">
        <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
          <div>
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("reading.detail.languageText")}</p>
            <h2>{t("reading.detail.encountered")}</h2>
          </div>
          <BookOpenCheck size={19} />
        </div>

        {reading.grammarTargets.length ? (
          <div className="reading-summary-group [display:grid] [gap:10px] [&_+_.reading-summary-group]:[margin-top:18px]">
            <strong>{t("reading.detail.grammar")}</strong>
            <div className="relation-list [display:flex] [flex-wrap:wrap] [gap:8px]">
              {reading.grammarTargets.map((target) => (
                <Link
                  className="relation-chip [min-height:48px] [min-width:110px] [display:inline-flex] [flex-direction:column] [justify-content:center] [gap:3px] [padding:8px_12px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [&_span]:[font-weight:600] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.66rem]"
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
          <div className="reading-summary-group [display:grid] [gap:10px] [&_+_.reading-summary-group]:[margin-top:18px]">
            <strong>{t("reading.detail.vocabulary")}</strong>
            <div className="relation-list [display:flex] [flex-wrap:wrap] [gap:8px]">
              {reading.targets.map((target) => (
                <Link
                  className="relation-chip [min-height:48px] [min-width:110px] [display:inline-flex] [flex-direction:column] [justify-content:center] [gap:3px] [padding:8px_12px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [&_span]:[font-weight:600] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.66rem]"
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

      <section className="panel story-summary [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [&_p]:[line-height:1.65] [border-radius:18px]">
        <h2 className="section-title [margin:0_0_10px] [font-size:1rem] [color:var(--text-soft)] [letter-spacing:-0.02em]">{t("reading.detail.summary")}</h2>
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
