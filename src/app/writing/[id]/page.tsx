import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { writingEvaluationSchema } from "@/lib/ai/writing-evaluator";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { getServerTranslator } from "@/i18n/server";
import { formatNumber, formatPercent } from "@/i18n/format";
import type { MessageKey } from "@/i18n/core";
import { WritingEditor } from "./WritingEditor";
import { RewriteButton } from "./RewriteButton";

const scoreLabelKeys: Record<string, MessageKey> = {
  overall: "writing.detail.score.overall",
  task: "writing.detail.score.task",
  organization: "writing.detail.score.organization",
  grammar: "writing.detail.score.grammar",
  range: "writing.detail.score.range",
  accuracy: "writing.detail.score.accuracy",
  naturalness: "writing.detail.score.naturalness",
};

export default async function WritingSessionPage({
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
  const session = await db.writingSession.findFirst({
    where: { id, userId: user.id, userCourseId: course.id },
    include: {
      targets: {
        include: { lexeme: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!session) notFound();

  const evaluation = session.evaluation
    ? writingEvaluationSchema.safeParse(session.evaluation)
    : null;

  const grammarObservationIds = evaluation?.success
    ? Array.from(
        new Set(
          evaluation.data.grammarObservations.map(
            (observation) => observation.grammarConceptId,
          ),
        ),
      )
    : [];
  const grammarConcepts = grammarObservationIds.length
    ? await db.grammarConcept.findMany({
        where: { id: { in: grammarObservationIds } },
        select: {
          id: true,
          slug: true,
          title: true,
          introducedAt: true,
        },
      })
    : [];
  const grammarConceptById = new Map(
    grammarConcepts.map((concept) => [concept.id, concept]),
  );

  const parent = session.parentId
    ? await db.writingSession.findFirst({
        where: { id: session.parentId, userId: user.id, userCourseId: course.id },
        select: { evaluation: true, draft: true, wordCount: true },
      })
    : null;
  const parentEvaluation = parent?.evaluation
    ? writingEvaluationSchema.safeParse(parent.evaluation)
    : null;
  const rewrites = !session.parentId
    ? await db.writingSession.findMany({
        where: { userId: user.id, userCourseId: course.id, parentId: session.id },
        select: {
          id: true,
          status: true,
          draft: true,
          wordCount: true,
          evaluation: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const modeLabel =
    session.mode === "GUIDED" ? t("writing.guided") : t("writing.open");

  return (
    <main className="page writing-session-page">
      <section className="page-header compact writing-session-header">
        <Link href="/writing" className="back-link">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("writing.detail.back")}
        </Link>
        <div className="word-meta">
          <span className="badge">{modeLabel}</span>
          <span className="badge">{session.level}</span>
          <span className="badge">
            {t("writing.detail.targetWords", {
              count: formatNumber(locale, session.targetWords),
            })}
          </span>
        </div>
        <h1 className="learning-content" dir="auto">{session.topic}</h1>
      </section>

      <section className="panel writing-task">
        <p className="eyebrow">{t("writing.detail.task")}</p>
        <pre className="learning-content" lang="de" dir="ltr">{session.task}</pre>

        {session.targets.length ? (
          <div className="writing-targets">
            {session.targets.slice(0, 10).map((target) => (
              <span
                key={target.id}
                className="learning-content"
                lang="de"
                dir="ltr"
              >
                {formatLexemeLabel(target.lexeme)}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {session.status === "ACTIVE" ? (
        <>
          {parent ? (
            <section className="panel rewrite-reference">
              <p className="eyebrow">{t("writing.detail.rewrite")}</p>
              <p className="muted">{t("writing.detail.rewriteHelp")}</p>
              {parentEvaluation?.success ? (
                <>
                  <p className="rewrite-score">
                    {t("writing.detail.previousOverall", {
                      percent: formatPercent(
                        locale,
                        parentEvaluation.data.overall,
                      ),
                    })}
                  </p>
                  <ul>
                    {parentEvaluation.data.improvements.map((item) => (
                      <li className="learning-content" dir="auto" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          ) : null}
          <WritingEditor
            sessionId={session.id}
            initialDraft={session.draft}
            targetWords={session.targetWords}
          />
        </>
      ) : evaluation?.success ? (
        <>
          {parentEvaluation?.success ? (
            <section className="writing-improvement-banner">
              <CheckCircle2 size={19} />
              <div>
                <strong>
                  {t("writing.detail.improvement", {
                    points: formatNumber(
                      locale,
                      Math.round(
                        (evaluation.data.overall -
                          parentEvaluation.data.overall) *
                          100,
                      ),
                      { signDisplay: "always" },
                    ),
                  })}
                </strong>
                <span>{t("writing.detail.improvementHelp")}</span>
              </div>
            </section>
          ) : null}

          <section className="writing-score-grid">
            {[
              ["overall", evaluation.data.overall],
              ["task", evaluation.data.taskCompletion],
              ["organization", evaluation.data.organization],
              ["grammar", evaluation.data.grammar],
              ["range", evaluation.data.vocabularyRange],
              ["accuracy", evaluation.data.vocabularyAccuracy],
              ["naturalness", evaluation.data.naturalness],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <strong>{formatPercent(locale, Number(value))}</strong>
                <span>
                  {t(scoreLabelKeys[String(label)] ?? "writing.detail.score.overall")}
                </span>
              </div>
            ))}
          </section>

          <section className="panel writing-summary">
            <p className="eyebrow">{t("writing.detail.summary")}</p>
            <p className="learning-content" dir="auto">{evaluation.data.summary}</p>
          </section>

          {evaluation.data.grammarObservations.length ? (
            <section className="panel writing-feedback-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{t("writing.detail.grammarEyebrow")}</p>
                  <h2>{t("writing.detail.grammarTitle")}</h2>
                </div>
                <Sparkles size={19} />
              </div>

              <div className="writing-grammar-observations">
                {evaluation.data.grammarObservations.map((observation, index) => {
                  const concept = grammarConceptById.get(
                    observation.grammarConceptId,
                  );
                  if (!concept) return null;
                  const isError = observation.signal === "ERROR";
                  const isOpportunity = observation.signal === "OPPORTUNITY";
                  return (
                    <article
                      className={
                        "writing-grammar-observation writing-grammar-observation--" +
                        observation.signal.toLowerCase()
                      }
                      key={
                        observation.grammarConceptId +
                        ":" +
                        observation.signal +
                        ":" +
                        index
                      }
                    >
                      <div className="writing-grammar-observation-head">
                        <div>
                          <div className="word-meta">
                            <span className="badge">{concept.introducedAt}</span>
                            <span className="badge">
                              {isError
                                ? t("writing.detail.needsWork")
                                : isOpportunity
                                  ? t("writing.detail.opportunity")
                                  : t("writing.detail.usedCorrectly")}
                            </span>
                          </div>
                          <strong className="learning-content" lang="en" dir="ltr">
                            {concept.title}
                          </strong>
                        </div>
                        {isError ? (
                          <CircleAlert size={18} />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                      </div>

                      <p className="learning-content" lang="de" dir="ltr">
                        {observation.original}
                      </p>
                      {observation.corrected ? (
                        <p className="muted">
                          {isOpportunity
                            ? t("writing.detail.try")
                            : t("writing.detail.correction")}{" "}
                          <strong className="learning-content" lang="de" dir="ltr">
                            {observation.corrected}
                          </strong>
                        </p>
                      ) : null}
                      <p className="muted learning-content" dir="auto">
                        {observation.explanation}
                      </p>

                      <div className="button-row">
                        <Link
                          className="button button-secondary"
                          href={"/grammar/" + concept.slug}
                        >
                          {t("writing.detail.learn")}
                        </Link>
                        {!isOpportunity ? (
                          <Link
                            className="button button-primary"
                            href={"/practice?grammar=" + concept.slug}
                          >
                            {t("writing.detail.practice")}
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="writing-result-grid">
            <article className="panel">
              <p className="eyebrow">{t("writing.detail.strengths")}</p>
              <ul>
                {evaluation.data.strengths.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel">
              <p className="eyebrow">{t("writing.detail.improveNext")}</p>
              <ul>
                {evaluation.data.improvements.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </section>

          {evaluation.data.targetUsage.length ? (
            <section className="panel writing-feedback-section">
              <p className="eyebrow">{t("writing.detail.vocabUsage")}</p>
              {evaluation.data.targetUsage.map((usage) => {
                const target = session.targets.find(
                  (item) => item.lexemeId === usage.lexemeId,
                );
                if (!target) return null;
                return (
                  <div className="writing-feedback-row" key={usage.lexemeId}>
                    <div>
                      <strong className="learning-content" lang="de" dir="ltr">
                        {target.lexeme.lemma}
                      </strong>
                      <span className="learning-content" dir="auto">{usage.note}</span>
                    </div>
                    <div className="target-result-status">
                      <span>
                        {usage.used
                          ? t("writing.detail.used")
                          : t("writing.detail.notUsed")}
                      </span>
                      <span>
                        {usage.correct
                          ? t("writing.detail.correct")
                          : t("writing.detail.needsWork")}
                      </span>
                      <span>
                        {t("writing.detail.natural", {
                          percent: formatPercent(locale, usage.naturalness),
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}

          {evaluation.data.repetition.length ? (
            <section className="panel writing-feedback-section">
              <p className="eyebrow">{t("writing.detail.repetition")}</p>
              {evaluation.data.repetition.map((item) => (
                <div className="writing-feedback-row" key={item.item}>
                  <div>
                    <strong className="learning-content" lang="de" dir="ltr">
                      {item.item} · {formatNumber(locale, item.count)}×
                    </strong>
                    <span className="learning-content" dir="auto">
                      {item.suggestion}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {evaluation.data.collocationFeedback.length ? (
            <section className="panel writing-feedback-section">
              <p className="eyebrow">{t("writing.detail.collocations")}</p>
              <ul>
                {evaluation.data.collocationFeedback.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {evaluation.data.corrections.length ? (
            <section className="panel writing-feedback-section">
              <p className="eyebrow">{t("writing.detail.corrections")}</p>
              {evaluation.data.corrections.map((item, index) => (
                <div className="writing-correction" key={index}>
                  <del className="learning-content" lang="de" dir="ltr">
                    {item.original}
                  </del>
                  <strong className="learning-content" lang="de" dir="ltr">
                    {item.corrected}
                  </strong>
                  <span className="learning-content" dir="auto">
                    {item.explanation}
                  </span>
                </div>
              ))}
            </section>
          ) : null}

          {evaluation.data.strongerVocabulary.length ? (
            <section className="panel writing-feedback-section">
              <p className="eyebrow">{t("writing.detail.strongerVocab")}</p>
              {evaluation.data.strongerVocabulary.map((item) => (
                <div className="writing-feedback-row" key={item.german}>
                  <div>
                    <strong className="learning-content" lang="de" dir="ltr">
                      {item.german}
                    </strong>
                    <span className="learning-content" dir="auto">
                      {item.meaning} · {item.rationale}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          <section className="panel improved-writing">
            <p className="eyebrow">{t("writing.detail.improvedVersion")}</p>
            <p className="learning-content" lang="de" dir="ltr">
              {evaluation.data.improvedVersion}
            </p>
          </section>

          {parent ? (
            <section className="writing-comparison">
              <article className="panel">
                <p className="eyebrow">{t("writing.detail.previousAttempt")}</p>
                <p className="learning-content" lang="de" dir="ltr">
                  {parent.draft}
                </p>
              </article>
              <article className="panel">
                <p className="eyebrow">{t("writing.detail.rewrite")}</p>
                <p className="learning-content" lang="de" dir="ltr">
                  {session.draft}
                </p>
              </article>
            </section>
          ) : null}

          <RewriteButton sessionId={session.id} />

          {rewrites.length ? (
            <section className="page-section rewrite-history">
              <h2 className="section-title">{t("writing.detail.rewriteHistory")}</h2>
              <div className="collection-list">
                {rewrites.map((rewrite, index) => {
                  const rewriteEvaluation = rewrite.evaluation
                    ? writingEvaluationSchema.safeParse(rewrite.evaluation)
                    : null;
                  const status =
                    rewrite.status === "EVALUATED"
                      ? t("writing.status.evaluated")
                      : t("writing.status.active");
                  return (
                    <Link
                      className="collection-row"
                      href={"/writing/" + rewrite.id}
                      key={rewrite.id}
                    >
                      <div>
                        <strong>
                          {t("writing.detail.rewriteNumber", {
                            number: formatNumber(locale, index + 1),
                          })}
                        </strong>
                        <span>
                          {t("writing.detail.historySummary", {
                            status,
                            count: formatNumber(locale, rewrite.wordCount),
                          })}
                          {rewriteEvaluation?.success
                            ? t("writing.detail.historyOverall", {
                                percent: formatPercent(
                                  locale,
                                  rewriteEvaluation.data.overall,
                                ),
                              })
                            : ""}
                        </span>
                      </div>
                      <ArrowLeft
                        className="rewrite-history-arrow rtl-mirror"
                        size={16}
                      />
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="empty-state">
          <strong>{t("writing.detail.evaluationUnreadable")}</strong>
        </div>
      )}
    </main>
  );
}
