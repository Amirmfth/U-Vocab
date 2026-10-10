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
    <main className="page writing-session-page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2991113b44 in-writing-task:max-w-uv-d1f4d3e141 in-writing-task:p-4.5 in-writing-task:bg-uv-surface in-writing-task-pre:text-uv-fbe55c92df5 in-writing-task-pre:line-height-1p7 in-writing-editor:max-w-uv-0927635a28 in-writing-editor:gap-3 in-writing-editor-textarea:min-height-52dvh in-writing-editor-textarea:p-4 in-writing-editor-textarea:border-uv-border-strong in-writing-editor-textarea:rounded-uv-r6d27d54c6c in-writing-editor-textarea:bg-linear-gradient-180deg-rgb-255-255-255-0p018-transparent-18r in-writing-editor-textarea:text-uv-fcb7a01623a in-writing-editor-textarea:line-height-1p75 in-writing-editor-textarea-focus:bg-uv-cfcbfb23a40 in-writing-editor-footer:border-uv-border-strong in-writing-editor-footer:box-shadow-0-14px-34px-rgb-0-0-0-0p26 in-writing-score-grid:border-uv-border-strong in-writing-score-grid:rounded-uv-r6d27d54c6c in-writing-score-grid:bg-uv-surface in-writing-score-grid-div:min-h-18.5 in-writing-score-grid-div:justify-center in-writing-score-grid-div:p-3.5 in-writing-score-grid-strong:text-uv-f3951047c34 in-writing-summary:max-w-uv-d1f4d3e141 in-improved-writing:max-w-uv-d1f4d3e141 in-writing-feedback-section:max-w-uv-0927635a28 uv-min620:in-writing-editor-textarea:min-height-56vh uv-min620:in-writing-editor-textarea:p-5 uv-min940:in-writing-editor:max-w-uv-2e0eb67d1b uv-min940:in-writing-editor-footer:static uv-min940:in-writing-editor-footer:p-0 uv-min940:in-writing-editor-footer:border-0 uv-min940:in-writing-editor-footer:bg-transparent uv-min940:in-writing-editor-footer:box-shadow-none uv-min940:in-writing-editor-footer:backdrop-filter-none">
      <section className="page-header compact writing-session-header flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 max-w-uv-d1f4d3e141 in-h1:text-uv-f13caea62a0 in-h1:line-height-0p98">
        <Link href="/writing" className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-uv-fa2582d5d6e">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("writing.detail.back")}
        </Link>
        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{modeLabel}</span>
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{session.level}</span>
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">
            {t("writing.detail.targetWords", {
              count: formatNumber(locale, session.targetWords),
            })}
          </span>
        </div>
        <h1 className="learning-content" dir="auto">{session.topic}</h1>
      </section>

      <section className="panel writing-task border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3 in-pre:m-0 in-pre:whitespace-pre-wrap in-pre:font-inherit in-pre:line-height-1p6 in-pre:text-uv-text-soft rounded-uv-r6d27d54c6c">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.task")}</p>
        <pre className="learning-content" lang={targetLanguageCode} dir="ltr">{session.task}</pre>

        {session.targets.length ? (
          <div className="writing-targets flex flex-wrap gap-1.5 in-span:padding-5px-8px in-span:border-1px-solid-border-2 in-span:rounded-uv-red9ab892c5 in-span:bg-uv-surface-raised in-span:text-uv-f58b84cc6f5">
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
            <section className="panel rewrite-reference border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 in-ul:margin-8px-0-0 in-ul:pl-5 in-ul:text-uv-text-soft rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.rewrite")}</p>
              <p className="muted text-uv-text-muted">{t("writing.detail.rewriteHelp")}</p>
              {parentEvaluation?.success ? (
                <>
                  <p className="rewrite-score margin-14px-0-0 text-uv-primary-strong font-650">
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
            <section className="writing-improvement-banner flex items-start gap-2.5 padding-12px-13px border-1px-solid-rgb-73-201-139-0p28 rounded-uv-r233710a71e bg-uv-cb0392f6948 in-svg:text-uv-success in-svg:flex-0-0-auto in-div:flex in-div:flex-col in-div:gap-0.75 in-span:text-uv-text-muted in-span:text-uv-f63777cce16">
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

          <section className="writing-score-grid grid grid-template-columns-repeat-2-minmax-0-1fr border-1px-solid-border-2 rounded-uv-rd65225386d overflow-hidden in-div:flex in-div:flex-col in-div:gap-0.75 in-div:p-3 in-div:border-1px-solid-border in-div-nth-child-odd:border-1px-solid-border-4 in-strong-2:font-font-geist-mono-geist-mono-monospace in-strong-2:text-uv-f6d7755962e in-span:text-uv-text-muted in-span:text-uv-ff7862da171 in-span:capitalize uv-min620:grid-template-columns-repeat-4-minmax-0-1fr uv-min620:in-div:border-0-2 uv-min620:in-div-nth-child-odd:border-0-2 uv-min620:in-div-div:border-1px-solid-border-5">
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

          <section className="panel writing-summary border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 in-p-last-child:mb-0 in-p-last-child:whitespace-pre-wrap in-p-last-child:line-height-1p6 rounded-uv-r6d27d54c6c">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.summary")}</p>
            <p className="learning-content" dir="auto">{evaluation.data.summary}</p>
          </section>

          {evaluation.data.grammarObservations.length ? (
            <section className="panel writing-feedback-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-ul:margin-8px-0-0 in-ul:pl-4.5 in-li:margin-6px-0 in-li:text-uv-text-soft in-li:line-height-1p45 rounded-uv-r6d27d54c6c">
              <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
                <div>
                  <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.grammarEyebrow")}</p>
                  <h2>{t("writing.detail.grammarTitle")}</h2>
                </div>
                <Sparkles size={19} />
              </div>

              <div className="writing-grammar-observations grid gap-3">
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
                        "writing-grammar-observation grid gap-2.5 p-3.5 border-1px-solid-border-2 rounded-uv-rd65225386d in-writing-grammar-observation-error:border-3px-solid-text in-writing-grammar-observation-opportunity:border-dashed in-button-row:flex in-button-row:flex-wrap in-button-row:gap-2 writing-grammar-observation--" +
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
                      <div className="writing-grammar-observation-head flex items-start justify-between gap-3 in-div:grid in-div:gap-1.5">
                        <div>
                          <div className="word-meta flex flex-wrap gap-1.75 items-center">
                            <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{concept.introducedAt}</span>
                            <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">
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
                        <p className="muted text-uv-text-muted">
                          {isOpportunity
                            ? t("writing.detail.try")
                            : t("writing.detail.correction")}{" "}
                          <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                            {observation.corrected}
                          </strong>
                        </p>
                      ) : null}
                      <p className="muted learning-content text-uv-text-muted" dir="auto">
                        {observation.explanation}
                      </p>

                      <div className="button-row">
                        <Link
                          className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
                          href={"/grammar/" + concept.slug}
                        >
                          {t("writing.detail.learn")}
                        </Link>
                        {!isOpportunity ? (
                          <Link
                            className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
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

          <section className="writing-result-grid flex flex-col gap-3.5 in-ul:margin-8px-0-0 in-ul:pl-4.5 in-li:margin-6px-0 in-li:text-uv-text-soft in-li:line-height-1p45 uv-min620:grid uv-min620:grid-template-columns-repeat-2-minmax-0-1fr">
            <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.strengths")}</p>
              <ul>
                {evaluation.data.strengths.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.improveNext")}</p>
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
            <section className="panel writing-feedback-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-ul:margin-8px-0-0 in-ul:pl-4.5 in-li:margin-6px-0 in-li:text-uv-text-soft in-li:line-height-1p45 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.vocabUsage")}</p>
              {evaluation.data.targetUsage.map((usage) => {
                const target = session.targets.find(
                  (item) => item.lexemeId === usage.lexemeId,
                );
                if (!target) return null;
                return (
                  <div className="writing-feedback-row flex flex-col gap-1.25 padding-11px-0 border-1px-solid-border last:border-0-3 in-div-first-child:flex in-div-first-child:flex-col in-div-first-child:gap-1 in-span:text-uv-text-muted in-span:line-height-1p45" key={usage.lexemeId}>
                    <div>
                      <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                        {target.lexeme.lemma}
                      </strong>
                      <span className="learning-content" dir="auto">{usage.note}</span>
                    </div>
                    <div className="target-result-status flex flex-wrap gap-1.5 in-span:padding-4px-7px in-span:border-1px-solid-border-2 in-span:rounded-uv-red9ab892c5 in-span:text-uv-text-muted in-span:text-uv-f2311a7d95c">
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
            <section className="panel writing-feedback-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-ul:margin-8px-0-0 in-ul:pl-4.5 in-li:margin-6px-0 in-li:text-uv-text-soft in-li:line-height-1p45 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.repetition")}</p>
              {evaluation.data.repetition.map((item) => (
                <div className="writing-feedback-row flex flex-col gap-1.25 padding-11px-0 border-1px-solid-border last:border-0-3 in-div-first-child:flex in-div-first-child:flex-col in-div-first-child:gap-1 in-span:text-uv-text-muted in-span:line-height-1p45" key={item.item}>
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
            <section className="panel writing-feedback-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-ul:margin-8px-0-0 in-ul:pl-4.5 in-li:margin-6px-0 in-li:text-uv-text-soft in-li:line-height-1p45 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.collocations")}</p>
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
            <section className="panel writing-feedback-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-ul:margin-8px-0-0 in-ul:pl-4.5 in-li:margin-6px-0 in-li:text-uv-text-soft in-li:line-height-1p45 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.corrections")}</p>
              {evaluation.data.corrections.map((item, index) => (
                <div className="writing-correction flex flex-col gap-1.25 padding-11px-0 border-1px-solid-border last:border-0-3 in-span:text-uv-text-muted in-span:line-height-1p45 in-del:text-uv-danger in-strong-2:text-uv-success" key={index}>
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
            <section className="panel writing-feedback-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-ul:margin-8px-0-0 in-ul:pl-4.5 in-li:margin-6px-0 in-li:text-uv-text-soft in-li:line-height-1p45 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.strongerVocab")}</p>
              {evaluation.data.strongerVocabulary.map((item) => (
                <div className="writing-feedback-row flex flex-col gap-1.25 padding-11px-0 border-1px-solid-border last:border-0-3 in-div-first-child:flex in-div-first-child:flex-col in-div-first-child:gap-1 in-span:text-uv-text-muted in-span:line-height-1p45" key={item.targetText}>
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

          <section className="panel improved-writing border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 in-p-last-child:mb-0 in-p-last-child:whitespace-pre-wrap in-p-last-child:line-height-1p6 rounded-uv-r6d27d54c6c">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.improvedVersion")}</p>
            <p className="learning-content" lang={targetLanguageCode} dir="ltr">
              {evaluation.data.improvedVersion}
            </p>
          </section>

          {parent ? (
            <section className="writing-comparison flex flex-col gap-3.5 in-article-p-last-child:mb-0 in-article-p-last-child:whitespace-pre-wrap in-article-p-last-child:line-height-1p6 uv-min620:grid uv-min620:grid-template-columns-repeat-2-minmax-0-1fr">
              <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c">
                <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.previousAttempt")}</p>
                <p className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {parent.draft}
                </p>
              </article>
              <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c">
                <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("writing.detail.rewrite")}</p>
                <p className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {session.draft}
                </p>
              </article>
            </section>
          ) : null}

          <RewriteButton sessionId={session.id} />

          {rewrites.length ? (
            <section className="page-section rewrite-history flex flex-col gap-3">
              <h2 className="section-title margin-0-0-10px text-uv-f19feeb881c text-uv-text-soft letter-spacing-0p02em-2">{t("writing.detail.rewriteHistory")}</h2>
              <div className="collection-list flex flex-col">
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
                      className="collection-row border-1px-solid-border min-h-16 grid grid-template-columns-minmax-0-1fr-auto items-center gap-3 padding-11px-2px in-strong-2:block in-span:block in-span:mt-0.75 in-span:text-uv-text-muted in-span:text-uv-f74fc13de71 uv-min940:hover:bg-uv-surface"
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
                        className="rewrite-history-arrow rtl-mirror transform-rotate-180deg"
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
        <div className="empty-state flex flex-col gap-3 items-start p-6 border-1px-dashed-border-strong rounded-uv-r02a0a889dd text-uv-text-soft">
          <strong>{t("writing.detail.evaluationUnreadable")}</strong>
        </div>
      )}
    </main>
  );
}
