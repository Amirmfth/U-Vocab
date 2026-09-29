import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { writingEvaluationSchema } from "@/lib/ai/writing-evaluator";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { WritingEditor } from "./WritingEditor";
import { RewriteButton } from "./RewriteButton";


function percent(value: number) {
  return Math.round(value * 100);
}

export default async function WritingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user, course] = await Promise.all([params, getCurrentUser(), getCurrentCourse()]);
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

  return (
    <main className="page writing-session-page">
      <section className="page-header compact writing-session-header">
        <Link href="/writing" className="back-link">
          <ArrowLeft size={16} />
          Writing
        </Link>
        <div className="word-meta">
          <span className="badge">{session.mode.toLowerCase()}</span>
          <span className="badge">{session.level}</span>
          <span className="badge">~{session.targetWords} words</span>
        </div>
        <h1>{session.topic}</h1>
      </section>

      <section className="panel writing-task">
        <p className="eyebrow">TASK</p>
        <pre>{session.task}</pre>

        {session.targets.length ? (
          <div className="writing-targets">
            {session.targets.slice(0, 10).map((target) => (
              <span key={target.id}>
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
              <p className="eyebrow">REWRITE</p>
              <p className="muted">
                Improve your previous attempt using its feedback. The task remains the same.
              </p>
              {parentEvaluation?.success ? (
                <>
                  <p className="rewrite-score">Previous overall: {percent(parentEvaluation.data.overall)}%</p>
                  <ul>
                    {parentEvaluation.data.improvements.map((item) => (
                      <li key={item}>{item}</li>
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
                  {percent(evaluation.data.overall) - percent(parentEvaluation.data.overall) >= 0
                    ? "+"
                    : ""}
                  {percent(evaluation.data.overall) - percent(parentEvaluation.data.overall)} points
                </strong>
                <span>overall improvement from your previous attempt</span>
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
                <strong>{percent(Number(value))}%</strong>
                <span>{label}</span>
              </div>
            ))}
          </section>

          <section className="panel writing-summary">
            <p className="eyebrow">SUMMARY</p>
            <p>{evaluation.data.summary}</p>
          </section>

          {evaluation.data.grammarObservations.length ? (
            <section className="panel writing-feedback-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">GRAMMAR IN YOUR WRITING</p>
                  <h2>Concept-level feedback</h2>
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
                                ? "needs work"
                                : isOpportunity
                                  ? "opportunity"
                                  : "used correctly"}
                            </span>
                          </div>
                          <strong>{concept.title}</strong>
                        </div>
                        {isError ? (
                          <CircleAlert size={18} />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                      </div>

                      <p>{observation.original}</p>
                      {observation.corrected ? (
                        <p className="muted">
                          {isOpportunity ? "Try: " : "Correction: "}
                          <strong>{observation.corrected}</strong>
                        </p>
                      ) : null}
                      <p className="muted">{observation.explanation}</p>

                      <div className="button-row">
                        <Link
                          className="button button-secondary"
                          href={"/grammar/" + concept.slug}
                        >
                          Learn
                        </Link>
                        {!isOpportunity ? (
                          <Link
                            className="button button-primary"
                            href={"/practice?grammar=" + concept.slug}
                          >
                            Practice
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
              <p className="eyebrow">STRENGTHS</p>
              <ul>
                {evaluation.data.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="panel">
              <p className="eyebrow">IMPROVE NEXT</p>
              <ul>
                {evaluation.data.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>

          {evaluation.data.targetUsage.length ? (
            <section className="panel writing-feedback-section">
              <p className="eyebrow">VOCABULARY USAGE</p>
              {evaluation.data.targetUsage.map((usage) => {
                const target = session.targets.find(
                  (item) => item.lexemeId === usage.lexemeId,
                );
                if (!target) return null;
                return (
                  <div className="writing-feedback-row" key={usage.lexemeId}>
                    <div>
                      <strong>{target.lexeme.lemma}</strong>
                      <span>{usage.note}</span>
                    </div>
                    <div className="target-result-status">
                      <span>{usage.used ? "used" : "not used"}</span>
                      <span>{usage.correct ? "correct" : "needs work"}</span>
                      <span>{percent(usage.naturalness)}% natural</span>
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}

          {evaluation.data.repetition.length ? (
            <section className="panel writing-feedback-section">
              <p className="eyebrow">REPETITION / OVERUSE</p>
              {evaluation.data.repetition.map((item) => (
                <div className="writing-feedback-row" key={item.item}>
                  <div>
                    <strong>{item.item} · {item.count}×</strong>
                    <span>{item.suggestion}</span>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {evaluation.data.collocationFeedback.length ? (
            <section className="panel writing-feedback-section">
              <p className="eyebrow">COLLOCATIONS & PATTERNS</p>
              <ul>
                {evaluation.data.collocationFeedback.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {evaluation.data.corrections.length ? (
            <section className="panel writing-feedback-section">
              <p className="eyebrow">CORRECTIONS</p>
              {evaluation.data.corrections.map((item, index) => (
                <div className="writing-correction" key={index}>
                  <del>{item.original}</del>
                  <strong>{item.corrected}</strong>
                  <span>{item.explanation}</span>
                </div>
              ))}
            </section>
          ) : null}

          {evaluation.data.strongerVocabulary.length ? (
            <section className="panel writing-feedback-section">
              <p className="eyebrow">STRONGER VOCABULARY TO EXPLORE</p>
              {evaluation.data.strongerVocabulary.map((item) => (
                <div className="writing-feedback-row" key={item.german}>
                  <div>
                    <strong>{item.german}</strong>
                    <span>{item.meaning} · {item.rationale}</span>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          <section className="panel improved-writing">
            <p className="eyebrow">IMPROVED VERSION</p>
            <p>{evaluation.data.improvedVersion}</p>
          </section>

          {parent ? (
            <section className="writing-comparison">
              <article className="panel">
                <p className="eyebrow">PREVIOUS ATTEMPT</p>
                <p>{parent.draft}</p>
              </article>
              <article className="panel">
                <p className="eyebrow">REWRITE</p>
                <p>{session.draft}</p>
              </article>
            </section>
          ) : null}

          <RewriteButton sessionId={session.id} />

          {rewrites.length ? (
            <section className="page-section rewrite-history">
              <h2 className="section-title">Rewrite history</h2>
              <div className="collection-list">
                {rewrites.map((rewrite, index) => {
                  const rewriteEvaluation = rewrite.evaluation
                    ? writingEvaluationSchema.safeParse(rewrite.evaluation)
                    : null;
                  return (
                    <Link className="collection-row" href={"/writing/" + rewrite.id} key={rewrite.id}>
                      <div>
                        <strong>Rewrite {index + 1}</strong>
                        <span>
                          {rewrite.status.toLowerCase()} · {rewrite.wordCount} words
                          {rewriteEvaluation?.success ? ` · ${percent(rewriteEvaluation.data.overall)}% overall` : ""}
                        </span>
                      </div>
                      <ArrowLeft className="rewrite-history-arrow" size={16} />
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="empty-state">
          <strong>Evaluation could not be read.</strong>
        </div>
      )}
    </main>
  );
}
