import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { writingEvaluationSchema } from "@/lib/ai/writing-evaluator";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
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
  const targetLanguageCode = targetLanguageConfig(course.targetLanguage).code;
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
    <main className="page writing-session-page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px] [width:100%] [max-width:980px] [&_.writing-task]:[max-width:820px] [&_.writing-task]:[padding:18px] [&_.writing-task]:[background:var(--surface)] [&_.writing-task_pre]:[font-size:0.94rem] [&_.writing-task_pre]:[line-height:1.7] [&_.writing-editor]:[max-width:900px] [&_.writing-editor]:[gap:12px] [&_.writing-editor_textarea]:[min-height:52dvh] [&_.writing-editor_textarea]:[padding:16px] [&_.writing-editor_textarea]:[border-color:var(--border-strong)] [&_.writing-editor_textarea]:[border-radius:18px] [&_.writing-editor_textarea]:[background:linear-gradient(180deg,_rgba(255,255,255,0.018),_transparent_18rem),_#0d0d10] [&_.writing-editor_textarea]:[font-size:1.03rem] [&_.writing-editor_textarea]:[line-height:1.75] [&_.writing-editor_textarea:focus]:[background:#101014] [&_.writing-editor-footer]:[border-color:var(--border-strong)] [&_.writing-editor-footer]:[box-shadow:0_14px_34px_rgba(0,0,0,0.26)] [&_.writing-score-grid]:[border-color:var(--border-strong)] [&_.writing-score-grid]:[border-radius:18px] [&_.writing-score-grid]:[background:var(--surface)] [&_.writing-score-grid_>_div]:[min-height:74px] [&_.writing-score-grid_>_div]:[justify-content:center] [&_.writing-score-grid_>_div]:[padding:14px] [&_.writing-score-grid_strong]:[font-size:1.35rem] [&_.writing-summary]:[max-width:820px] [&_.improved-writing]:[max-width:820px] [&_.writing-feedback-section]:[max-width:900px] min-[620px]:[&_.writing-editor_textarea]:[min-height:56vh] min-[620px]:[&_.writing-editor_textarea]:[padding:20px] min-[940px]:[&_.writing-editor]:[max-width:920px] min-[940px]:[&_.writing-editor-footer]:[position:static] min-[940px]:[&_.writing-editor-footer]:[padding:0] min-[940px]:[&_.writing-editor-footer]:[border:0] min-[940px]:[&_.writing-editor-footer]:[background:transparent] min-[940px]:[&_.writing-editor-footer]:[box-shadow:none] min-[940px]:[&_.writing-editor-footer]:[backdrop-filter:none]">
      <section className="page-header compact writing-session-header [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [max-width:820px] [&_h1]:[font-size:clamp(2.2rem,_9vw,_4.2rem)] [&_h1]:[line-height:0.98]">
        <Link href="/writing" className="back-link [width:fit-content] [min-height:40px] [display:inline-flex] [align-items:center] [gap:7px] [color:var(--text-muted)] [font-size:0.82rem]">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("writing.detail.back")}
        </Link>
        <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{modeLabel}</span>
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{session.level}</span>
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
            {t("writing.detail.targetWords", {
              count: formatNumber(locale, session.targetWords),
            })}
          </span>
        </div>
        <h1 className="learning-content" dir="auto">{session.topic}</h1>
      </section>

      <section className="panel writing-task [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:12px] [&_pre]:[margin:0] [&_pre]:[white-space:pre-wrap] [&_pre]:[font:inherit] [&_pre]:[line-height:1.6] [&_pre]:[color:var(--text-soft)] [border-radius:18px]">
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.task")}</p>
        <pre className="learning-content" lang={targetLanguageCode} dir="ltr">{session.task}</pre>

        {session.targets.length ? (
          <div className="writing-targets [display:flex] [flex-wrap:wrap] [gap:6px] [&_span]:[padding:5px_8px] [&_span]:[border:1px_solid_var(--border)] [&_span]:[border-radius:999px] [&_span]:[background:var(--surface-raised)] [&_span]:[font-size:0.7rem]">
            {session.targets.slice(0, 10).map((target) => (
              <span
                key={target.id}
                className="learning-content"
                lang={targetLanguageCode}
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
            <section className="panel rewrite-reference [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [&_ul]:[margin:8px_0_0] [&_ul]:[padding-left:20px] [&_ul]:[color:var(--text-soft)] [border-radius:18px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.rewrite")}</p>
              <p className="muted [color:var(--text-muted)]">{t("writing.detail.rewriteHelp")}</p>
              {parentEvaluation?.success ? (
                <>
                  <p className="rewrite-score [margin:14px_0_0] [color:var(--primary-strong)] [font-weight:650]">
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
            targetLanguageCode={targetLanguageCode}
          />
        </>
      ) : evaluation?.success ? (
        <>
          {parentEvaluation?.success ? (
            <section className="writing-improvement-banner [display:flex] [align-items:flex-start] [gap:10px] [padding:12px_13px] [border:1px_solid_rgba(73,_201,_139,_0.28)] [border-radius:13px] [background:rgba(73,_201,_139,_0.08)] [&_>_svg]:[color:var(--success)] [&_>_svg]:[flex:0_0_auto] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:3px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.74rem]">
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

          <section className="writing-score-grid [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [border:1px_solid_var(--border)] [border-radius:14px] [overflow:hidden] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:3px] [&_>_div]:[padding:12px] [&_>_div]:[border-bottom:1px_solid_var(--border)] [&_>_div:nth-child(odd)]:[border-right:1px_solid_var(--border)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_strong]:[font-size:1.15rem] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.66rem] [&_span]:[text-transform:capitalize] min-[620px]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] min-[620px]:[&_>_div]:[border-right:0] min-[620px]:[&_>_div:nth-child(odd)]:[border-right:0] min-[620px]:[&_>_div_+_div]:[border-left:1px_solid_var(--border)]">
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

          <section className="panel writing-summary [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [&_>_p:last-child]:[margin-bottom:0] [&_>_p:last-child]:[white-space:pre-wrap] [&_>_p:last-child]:[line-height:1.6] [border-radius:18px]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.summary")}</p>
            <p className="learning-content" dir="auto">{evaluation.data.summary}</p>
          </section>

          {evaluation.data.grammarObservations.length ? (
            <section className="panel writing-feedback-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_ul]:[margin:8px_0_0] [&_ul]:[padding-left:18px] [&_li]:[margin:6px_0] [&_li]:[color:var(--text-soft)] [&_li]:[line-height:1.45] [border-radius:18px]">
              <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
                <div>
                  <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.grammarEyebrow")}</p>
                  <h2>{t("writing.detail.grammarTitle")}</h2>
                </div>
                <Sparkles size={19} />
              </div>

              <div className="writing-grammar-observations [display:grid] [gap:12px]">
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
                        "writing-grammar-observation [display:grid] [gap:10px] [padding:14px] [border:1px_solid_var(--border)] [border-radius:14px] [&.writing-grammar-observation--error]:[border-inline-start:3px_solid_var(--text)] [&.writing-grammar-observation--opportunity]:[border-style:dashed] [&_.button-row]:[display:flex] [&_.button-row]:[flex-wrap:wrap] [&_.button-row]:[gap:8px] writing-grammar-observation--" +
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
                      <div className="writing-grammar-observation-head [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [&_>_div]:[display:grid] [&_>_div]:[gap:6px]">
                        <div>
                          <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
                            <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{concept.introducedAt}</span>
                            <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
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

                      <p className="learning-content" lang={targetLanguageCode} dir="ltr">
                        {observation.original}
                      </p>
                      {observation.corrected ? (
                        <p className="muted [color:var(--text-muted)]">
                          {isOpportunity
                            ? t("writing.detail.try")
                            : t("writing.detail.correction")}{" "}
                          <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                            {observation.corrected}
                          </strong>
                        </p>
                      ) : null}
                      <p className="muted learning-content [color:var(--text-muted)]" dir="auto">
                        {observation.explanation}
                      </p>

                      <div className="button-row">
                        <Link
                          className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
                          href={"/grammar/" + concept.slug}
                        >
                          {t("writing.detail.learn")}
                        </Link>
                        {!isOpportunity ? (
                          <Link
                            className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
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

          <section className="writing-result-grid [display:flex] [flex-direction:column] [gap:14px] [&_ul]:[margin:8px_0_0] [&_ul]:[padding-left:18px] [&_li]:[margin:6px_0] [&_li]:[color:var(--text-soft)] [&_li]:[line-height:1.45] min-[620px]:[display:grid] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
            <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.strengths")}</p>
              <ul>
                {evaluation.data.strengths.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.improveNext")}</p>
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
            <section className="panel writing-feedback-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_ul]:[margin:8px_0_0] [&_ul]:[padding-left:18px] [&_li]:[margin:6px_0] [&_li]:[color:var(--text-soft)] [&_li]:[line-height:1.45] [border-radius:18px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.vocabUsage")}</p>
              {evaluation.data.targetUsage.map((usage) => {
                const target = session.targets.find(
                  (item) => item.lexemeId === usage.lexemeId,
                );
                if (!target) return null;
                return (
                  <div className="writing-feedback-row [display:flex] [flex-direction:column] [gap:5px] [padding:11px_0] [border-bottom:1px_solid_var(--border)] [&:last-child]:[border-bottom:0] [&_>_div:first-child]:[display:flex] [&_>_div:first-child]:[flex-direction:column] [&_>_div:first-child]:[gap:4px] [&_span]:[color:var(--text-muted)] [&_span]:[line-height:1.45]" key={usage.lexemeId}>
                    <div>
                      <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                        {target.lexeme.lemma}
                      </strong>
                      <span className="learning-content" dir="auto">{usage.note}</span>
                    </div>
                    <div className="target-result-status [display:flex] [flex-wrap:wrap] [gap:6px] [&_span]:[padding:4px_7px] [&_span]:[border:1px_solid_var(--border)] [&_span]:[border-radius:999px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.65rem]">
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
            <section className="panel writing-feedback-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_ul]:[margin:8px_0_0] [&_ul]:[padding-left:18px] [&_li]:[margin:6px_0] [&_li]:[color:var(--text-soft)] [&_li]:[line-height:1.45] [border-radius:18px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.repetition")}</p>
              {evaluation.data.repetition.map((item) => (
                <div className="writing-feedback-row [display:flex] [flex-direction:column] [gap:5px] [padding:11px_0] [border-bottom:1px_solid_var(--border)] [&:last-child]:[border-bottom:0] [&_>_div:first-child]:[display:flex] [&_>_div:first-child]:[flex-direction:column] [&_>_div:first-child]:[gap:4px] [&_span]:[color:var(--text-muted)] [&_span]:[line-height:1.45]" key={item.item}>
                  <div>
                    <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
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
            <section className="panel writing-feedback-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_ul]:[margin:8px_0_0] [&_ul]:[padding-left:18px] [&_li]:[margin:6px_0] [&_li]:[color:var(--text-soft)] [&_li]:[line-height:1.45] [border-radius:18px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.collocations")}</p>
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
            <section className="panel writing-feedback-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_ul]:[margin:8px_0_0] [&_ul]:[padding-left:18px] [&_li]:[margin:6px_0] [&_li]:[color:var(--text-soft)] [&_li]:[line-height:1.45] [border-radius:18px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.corrections")}</p>
              {evaluation.data.corrections.map((item, index) => (
                <div className="writing-correction [display:flex] [flex-direction:column] [gap:5px] [padding:11px_0] [border-bottom:1px_solid_var(--border)] [&:last-child]:[border-bottom:0] [&_span]:[color:var(--text-muted)] [&_span]:[line-height:1.45] [&_del]:[color:var(--danger)] [&_strong]:[color:var(--success)]" key={index}>
                  <del className="learning-content" lang={targetLanguageCode} dir="ltr">
                    {item.original}
                  </del>
                  <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
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
            <section className="panel writing-feedback-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_ul]:[margin:8px_0_0] [&_ul]:[padding-left:18px] [&_li]:[margin:6px_0] [&_li]:[color:var(--text-soft)] [&_li]:[line-height:1.45] [border-radius:18px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.strongerVocab")}</p>
              {evaluation.data.strongerVocabulary.map((item) => (
                <div className="writing-feedback-row [display:flex] [flex-direction:column] [gap:5px] [padding:11px_0] [border-bottom:1px_solid_var(--border)] [&:last-child]:[border-bottom:0] [&_>_div:first-child]:[display:flex] [&_>_div:first-child]:[flex-direction:column] [&_>_div:first-child]:[gap:4px] [&_span]:[color:var(--text-muted)] [&_span]:[line-height:1.45]" key={item.targetText}>
                  <div>
                    <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                      {item.targetText}
                    </strong>
                    <span className="learning-content" dir="auto">
                      {item.meaning} · {item.rationale}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          <section className="panel improved-writing [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [&_>_p:last-child]:[margin-bottom:0] [&_>_p:last-child]:[white-space:pre-wrap] [&_>_p:last-child]:[line-height:1.6] [border-radius:18px]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.improvedVersion")}</p>
            <p className="learning-content" lang={targetLanguageCode} dir="ltr">
              {evaluation.data.improvedVersion}
            </p>
          </section>

          {parent ? (
            <section className="writing-comparison [display:flex] [flex-direction:column] [gap:14px] [&_article_>_p:last-child]:[margin-bottom:0] [&_article_>_p:last-child]:[white-space:pre-wrap] [&_article_>_p:last-child]:[line-height:1.6] min-[620px]:[display:grid] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
              <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]">
                <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.previousAttempt")}</p>
                <p className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {parent.draft}
                </p>
              </article>
              <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]">
                <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("writing.detail.rewrite")}</p>
                <p className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {session.draft}
                </p>
              </article>
            </section>
          ) : null}

          <RewriteButton sessionId={session.id} />

          {rewrites.length ? (
            <section className="page-section rewrite-history [display:flex] [flex-direction:column] [gap:12px]">
              <h2 className="section-title [margin:0_0_10px] [font-size:1rem] [color:var(--text-soft)] [letter-spacing:-0.02em]">{t("writing.detail.rewriteHistory")}</h2>
              <div className="collection-list [display:flex] [flex-direction:column]">
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
                      className="collection-row [border-bottom:1px_solid_var(--border)] [min-height:64px] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto] [align-items:center] [gap:12px] [padding:11px_2px] [&_strong]:[display:block] [&_span]:[display:block] [&_span]:[margin-top:3px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.76rem] min-[940px]:[&:hover]:[background:var(--surface)]"
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
                        className="rewrite-history-arrow rtl-mirror [transform:rotate(180deg)]"
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
        <div className="empty-state [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [padding:24px] [border:1px_dashed_var(--border-strong)] [border-radius:var(--radius-lg)] [color:var(--text-soft)]">
          <strong>{t("writing.detail.evaluationUnreadable")}</strong>
        </div>
      )}
    </main>
  );
}
