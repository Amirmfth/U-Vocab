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
    <main className="page writing-session-page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2991113b44 uv-v19f0956f17:max-w-uv-d1f4d3e141 uv-v19f0956f17:p-4.5 uv-v19f0956f17:bg-uv-surface uv-vaca0928d6e:text-uv-fbe55c92df5 uv-vaca0928d6e:uv-line-height-58e6d386c3 uv-v691ffddc27:max-w-uv-0927635a28 uv-v691ffddc27:gap-3 uv-v5143847986:uv-min-height-69924f8d09 uv-v5143847986:p-4 uv-v5143847986:border-uv-border-strong uv-v5143847986:rounded-uv-r6d27d54c6c uv-v5143847986:uv-background-4e298cec10 uv-v5143847986:text-uv-fcb7a01623a uv-v5143847986:uv-line-height-86d76fc750 uv-v642ba83c04:bg-uv-cfcbfb23a40 uv-ve70de6f77f:border-uv-border-strong uv-ve70de6f77f:uv-box-shadow-f19c4300a8 uv-vbfa1b6e621:border-uv-border-strong uv-vbfa1b6e621:rounded-uv-r6d27d54c6c uv-vbfa1b6e621:bg-uv-surface uv-v28c8916e41:min-h-18.5 uv-v28c8916e41:justify-center uv-v28c8916e41:p-3.5 uv-v0681bf294a:text-uv-f3951047c34 uv-v53390288ba:max-w-uv-d1f4d3e141 uv-v8dc5afe670:max-w-uv-d1f4d3e141 uv-vd79dd6aeee:max-w-uv-0927635a28 uv-min620:uv-v5143847986:uv-min-height-e5ba4e032a uv-min620:uv-v5143847986:p-5 uv-min940:uv-v691ffddc27:max-w-uv-2e0eb67d1b uv-min940:uv-ve70de6f77f:static uv-min940:uv-ve70de6f77f:p-0 uv-min940:uv-ve70de6f77f:border-0 uv-min940:uv-ve70de6f77f:bg-transparent uv-min940:uv-ve70de6f77f:uv-box-shadow-71f8e7976e uv-min940:uv-ve70de6f77f:uv-backdrop-filter-71f8e7976e">
      <section className="page-header compact writing-session-header flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 max-w-uv-d1f4d3e141 uv-v3bccf64584:text-uv-f13caea62a0 uv-v3bccf64584:uv-line-height-e6da655eed">
        <Link href="/writing" className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-uv-fa2582d5d6e">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("writing.detail.back")}
        </Link>
        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{modeLabel}</span>
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{session.level}</span>
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">
            {t("writing.detail.targetWords", {
              count: formatNumber(locale, session.targetWords),
            })}
          </span>
        </div>
        <h1 className="learning-content" dir="auto">{session.topic}</h1>
      </section>

      <section className="panel writing-task uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3 uv-v465306b89e:m-0 uv-v465306b89e:whitespace-pre-wrap uv-v465306b89e:uv-font-3e26d67509 uv-v465306b89e:uv-line-height-4693695d02 uv-v465306b89e:text-uv-text-soft rounded-uv-r6d27d54c6c">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.task")}</p>
        <pre className="learning-content" lang={targetLanguageCode} dir="ltr">{session.task}</pre>

        {session.targets.length ? (
          <div className="writing-targets flex flex-wrap gap-1.5 uv-v36c0309a03:uv-padding-24a7c581e4 uv-v36c0309a03:uv-border-8d7f82f403 uv-v36c0309a03:rounded-uv-red9ab892c5 uv-v36c0309a03:bg-uv-surface-raised uv-v36c0309a03:text-uv-f58b84cc6f5">
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
            <section className="panel rewrite-reference uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 uv-v10010674ad:uv-margin-86ddfb81a1 uv-v10010674ad:pl-5 uv-v10010674ad:text-uv-text-soft rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.rewrite")}</p>
              <p className="muted text-uv-text-muted">{t("writing.detail.rewriteHelp")}</p>
              {parentEvaluation?.success ? (
                <>
                  <p className="rewrite-score uv-margin-897443304a text-uv-primary-strong uv-weight-650">
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
            <section className="writing-improvement-banner flex items-start gap-2.5 uv-padding-fed09d08e0 uv-border-768674f7ad rounded-uv-r233710a71e bg-uv-cb0392f6948 uv-v872d6ea02a:text-uv-success uv-v872d6ea02a:uv-flex-18ba0b6e31 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f63777cce16">
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

          <section className="writing-score-grid grid uv-grid-template-columns-dd0b1a1848 uv-border-8d7f82f403 rounded-uv-rd65225386d overflow-hidden uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-0.75 uv-vcbb57f4d35:p-3 uv-vcbb57f4d35:uv-border-bottom-8d7f82f403 uv-v3de32a793f:uv-border-right-8d7f82f403 uv-veda02a0adb:uv-font-family-320794573f uv-veda02a0adb:text-uv-f6d7755962e uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff7862da171 uv-v36c0309a03:capitalize uv-min620:uv-grid-template-columns-0cbc4f103a uv-min620:uv-vcbb57f4d35:uv-border-right-b6589fc6ab uv-min620:uv-v3de32a793f:uv-border-right-b6589fc6ab uv-min620:uv-v5007062a75:uv-border-left-8d7f82f403">
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

          <section className="panel writing-summary uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 uv-vd9a40650be:mb-0 uv-vd9a40650be:whitespace-pre-wrap uv-vd9a40650be:uv-line-height-4693695d02 rounded-uv-r6d27d54c6c">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.summary")}</p>
            <p className="learning-content" dir="auto">{evaluation.data.summary}</p>
          </section>

          {evaluation.data.grammarObservations.length ? (
            <section className="panel writing-feedback-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-v10010674ad:uv-margin-86ddfb81a1 uv-v10010674ad:pl-4.5 uv-vbc8f6c01a9:uv-margin-c37400d7c5 uv-vbc8f6c01a9:text-uv-text-soft uv-vbc8f6c01a9:uv-line-height-2792cf2449 rounded-uv-r6d27d54c6c">
              <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
                <div>
                  <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.grammarEyebrow")}</p>
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
                        "writing-grammar-observation grid gap-2.5 p-3.5 uv-border-8d7f82f403 rounded-uv-rd65225386d uv-ve990c9e3f3:uv-border-inline-start-010bdec6ad uv-v98372579a2:border-dashed uv-v17ef11e3d4:flex uv-v17ef11e3d4:flex-wrap uv-v17ef11e3d4:gap-2 writing-grammar-observation--" +
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
                      <div className="writing-grammar-observation-head flex items-start justify-between gap-3 uv-vcbb57f4d35:grid uv-vcbb57f4d35:gap-1.5">
                        <div>
                          <div className="word-meta flex flex-wrap gap-1.75 items-center">
                            <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{concept.introducedAt}</span>
                            <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">
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
                          className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
                          href={"/grammar/" + concept.slug}
                        >
                          {t("writing.detail.learn")}
                        </Link>
                        {!isOpportunity ? (
                          <Link
                            className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
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

          <section className="writing-result-grid flex flex-col gap-3.5 uv-v10010674ad:uv-margin-86ddfb81a1 uv-v10010674ad:pl-4.5 uv-vbc8f6c01a9:uv-margin-c37400d7c5 uv-vbc8f6c01a9:text-uv-text-soft uv-vbc8f6c01a9:uv-line-height-2792cf2449 uv-min620:grid uv-min620:uv-grid-template-columns-dd0b1a1848">
            <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.strengths")}</p>
              <ul>
                {evaluation.data.strengths.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.improveNext")}</p>
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
            <section className="panel writing-feedback-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-v10010674ad:uv-margin-86ddfb81a1 uv-v10010674ad:pl-4.5 uv-vbc8f6c01a9:uv-margin-c37400d7c5 uv-vbc8f6c01a9:text-uv-text-soft uv-vbc8f6c01a9:uv-line-height-2792cf2449 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.vocabUsage")}</p>
              {evaluation.data.targetUsage.map((usage) => {
                const target = session.targets.find(
                  (item) => item.lexemeId === usage.lexemeId,
                );
                if (!target) return null;
                return (
                  <div className="writing-feedback-row flex flex-col gap-1.25 uv-padding-3da39b7f2e uv-border-bottom-8d7f82f403 last:uv-border-bottom-b6589fc6ab uv-v0fee2d502c:flex uv-v0fee2d502c:flex-col uv-v0fee2d502c:gap-1 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:uv-line-height-2792cf2449" key={usage.lexemeId}>
                    <div>
                      <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                        {target.lexeme.lemma}
                      </strong>
                      <span className="learning-content" dir="auto">{usage.note}</span>
                    </div>
                    <div className="target-result-status flex flex-wrap gap-1.5 uv-v36c0309a03:uv-padding-b9d3ef7fdf uv-v36c0309a03:uv-border-8d7f82f403 uv-v36c0309a03:rounded-uv-red9ab892c5 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f2311a7d95c">
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
            <section className="panel writing-feedback-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-v10010674ad:uv-margin-86ddfb81a1 uv-v10010674ad:pl-4.5 uv-vbc8f6c01a9:uv-margin-c37400d7c5 uv-vbc8f6c01a9:text-uv-text-soft uv-vbc8f6c01a9:uv-line-height-2792cf2449 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.repetition")}</p>
              {evaluation.data.repetition.map((item) => (
                <div className="writing-feedback-row flex flex-col gap-1.25 uv-padding-3da39b7f2e uv-border-bottom-8d7f82f403 last:uv-border-bottom-b6589fc6ab uv-v0fee2d502c:flex uv-v0fee2d502c:flex-col uv-v0fee2d502c:gap-1 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:uv-line-height-2792cf2449" key={item.item}>
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
            <section className="panel writing-feedback-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-v10010674ad:uv-margin-86ddfb81a1 uv-v10010674ad:pl-4.5 uv-vbc8f6c01a9:uv-margin-c37400d7c5 uv-vbc8f6c01a9:text-uv-text-soft uv-vbc8f6c01a9:uv-line-height-2792cf2449 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.collocations")}</p>
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
            <section className="panel writing-feedback-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-v10010674ad:uv-margin-86ddfb81a1 uv-v10010674ad:pl-4.5 uv-vbc8f6c01a9:uv-margin-c37400d7c5 uv-vbc8f6c01a9:text-uv-text-soft uv-vbc8f6c01a9:uv-line-height-2792cf2449 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.corrections")}</p>
              {evaluation.data.corrections.map((item, index) => (
                <div className="writing-correction flex flex-col gap-1.25 uv-padding-3da39b7f2e uv-border-bottom-8d7f82f403 last:uv-border-bottom-b6589fc6ab uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:uv-line-height-2792cf2449 uv-vc1468be021:text-uv-danger uv-veda02a0adb:text-uv-success" key={index}>
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
            <section className="panel writing-feedback-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-v10010674ad:uv-margin-86ddfb81a1 uv-v10010674ad:pl-4.5 uv-vbc8f6c01a9:uv-margin-c37400d7c5 uv-vbc8f6c01a9:text-uv-text-soft uv-vbc8f6c01a9:uv-line-height-2792cf2449 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.strongerVocab")}</p>
              {evaluation.data.strongerVocabulary.map((item) => (
                <div className="writing-feedback-row flex flex-col gap-1.25 uv-padding-3da39b7f2e uv-border-bottom-8d7f82f403 last:uv-border-bottom-b6589fc6ab uv-v0fee2d502c:flex uv-v0fee2d502c:flex-col uv-v0fee2d502c:gap-1 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:uv-line-height-2792cf2449" key={item.targetText}>
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

          <section className="panel improved-writing uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 uv-vd9a40650be:mb-0 uv-vd9a40650be:whitespace-pre-wrap uv-vd9a40650be:uv-line-height-4693695d02 rounded-uv-r6d27d54c6c">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.improvedVersion")}</p>
            <p className="learning-content" lang={targetLanguageCode} dir="ltr">
              {evaluation.data.improvedVersion}
            </p>
          </section>

          {parent ? (
            <section className="writing-comparison flex flex-col gap-3.5 uv-ve9bd506672:mb-0 uv-ve9bd506672:whitespace-pre-wrap uv-ve9bd506672:uv-line-height-4693695d02 uv-min620:grid uv-min620:uv-grid-template-columns-dd0b1a1848">
              <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
                <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.previousAttempt")}</p>
                <p className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {parent.draft}
                </p>
              </article>
              <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
                <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("writing.detail.rewrite")}</p>
                <p className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {session.draft}
                </p>
              </article>
            </section>
          ) : null}

          <RewriteButton sessionId={session.id} />

          {rewrites.length ? (
            <section className="page-section rewrite-history flex flex-col gap-3">
              <h2 className="section-title uv-margin-83bba30fc1 text-uv-f19feeb881c text-uv-text-soft uv-letter-spacing-235f37bdea">{t("writing.detail.rewriteHistory")}</h2>
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
                      className="collection-row uv-border-bottom-8d7f82f403 min-h-16 grid uv-grid-template-columns-f06dd92ea5 items-center gap-3 uv-padding-c9f5e3c335 uv-veda02a0adb:block uv-v36c0309a03:block uv-v36c0309a03:mt-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f74fc13de71 uv-min940:hover:bg-uv-surface"
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
                        className="rewrite-history-arrow rtl-mirror uv-transform-14214c0e93"
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
        <div className="empty-state flex flex-col gap-3 items-start p-6 uv-border-c8a81946fb rounded-uv-r02a0a889dd text-uv-text-soft">
          <strong>{t("writing.detail.evaluationUnreadable")}</strong>
        </div>
      )}
    </main>
  );
}
