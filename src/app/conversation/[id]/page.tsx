import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Target, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { conversationFinalEvaluationSchema } from "@/lib/ai/conversation-final-evaluator";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { getServerTranslator } from "@/i18n/server";
import { formatNumber, formatPercent } from "@/i18n/format";
import type { MessageKey } from "@/i18n/core";
import { ConversationChat } from "../ConversationChat";
import { checkQuota, getEntitlements } from "@/lib/entitlements/service";
import {
  ConversationFinish,
  ConversationReplay,
} from "../ConversationFinish";

const toneKeys: Record<string, MessageKey> = {
  FRIENDLY: "conversation.detail.tone.friendly",
  PROFESSIONAL: "conversation.detail.tone.professional",
  PLAYFUL: "conversation.detail.tone.playful",
  DIRECT: "conversation.detail.tone.direct",
  SUPPORTIVE: "conversation.detail.tone.supportive",
};

export default async function ConversationSessionPage({
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
  const session = await db.conversationSession.findFirst({
    where: { id, userId: user.id, userCourseId: course.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      targets: {
        include: { lexeme: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!session) notFound();

  const [entitlements, voiceQuota] = await Promise.all([
    getEntitlements(user.id),
    checkQuota({
      userId: user.id,
      userCourseId: course.id,
      timeZone: user.timezone,
      key: "voice_transcription_minutes_monthly",
    }),
  ]);

  const summary = session.summary
    ? conversationFinalEvaluationSchema.safeParse(session.summary)
    : null;

  const formalityLabel =
    session.formality === "CASUAL"
      ? t("conversation.detail.formality.casual")
      : session.formality === "FORMAL"
        ? t("conversation.detail.formality.formal")
        : t("conversation.detail.formality.contextual");

  return (
    <main className="page conversation-page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade">
        <Link href="/conversation" className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-uv-fa2582d5d6e">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("conversation.detail.back")}
        </Link>

        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">
            {session.kind === "MISSION"
              ? t("conversation.mission")
              : t("conversation.conversation")}
          </span>
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{session.level}</span>
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">
            {session.status === "COMPLETED"
              ? t("conversation.detail.status.completed")
              : t("conversation.detail.status.active")}
          </span>
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">
            {t(toneKeys[session.tone] ?? "conversation.detail.tone.friendly")}
          </span>
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{formalityLabel}</span>
        </div>

        <h1 className="learning-content" dir="auto">{session.title}</h1>
        <p className="page-description learning-content m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a" lang="de" dir="ltr">
          {session.scenario}
        </p>

        {session.objective ? (
          <div className="mission-objective flex items-start gap-2.5 uv-padding-fed09d08e0 uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface-raised uv-v872d6ea02a:uv-flex-18ba0b6e31 uv-v872d6ea02a:mt-0.5 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:uv-line-height-2792cf2449">
            <Target size={18} />
            <div>
              <strong>{t("conversation.detail.objective")}</strong>
              <span className="learning-content" lang="de" dir="ltr">
                {session.objective}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      {session.revealTargets || session.status === "COMPLETED" ? (
        <section
          className="conversation-targets flex gap-1.75 overflow-x-auto pb-0.75"
          aria-label={t("conversation.detail.targets")}
        >
          {session.targets.map((target) => (
            <div
              className={
                "conversation-target uv-min-width-db94728b84 flex flex-col gap-0.5 uv-padding-1eec12de18 uv-border-8d7f82f403 rounded-uv-r4bd46d4017 bg-uv-surface uv-v22810335d8:text-uv-fe9d5fd6635 uv-v22810335d8:uv-weight-650 uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-f174ef476a0 uv-v4ec7069b3c:border-uv-c126ca15671 uv-v4ec7069b3c:bg-uv-c3bbdd32fbd " +
                (target.successfulUses > 0 ? "is-used" : "")
              }
              key={target.id}
            >
              <span className="learning-content" lang="de" dir="ltr">
                {formatLexemeLabel(target.lexeme)}
              </span>
              <small>
                {t("conversation.detail.correctUses", {
                  successful: formatNumber(locale, target.successfulUses),
                  total: formatNumber(locale, target.uses),
                })}
              </small>
            </div>
          ))}
        </section>
      ) : (
        <p className="secret-target-note m-0 text-uv-text-muted text-uv-f823f1262bd">
          {t("conversation.detail.hiddenTargets")}
        </p>
      )}

      {session.status === "ACTIVE" ? (
        <>
          <ConversationChat
            sessionId={session.id}
            initialMessages={session.messages.map((message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
            }))}
            tutorLabel={session.aiRole}
            targetLanguage={course.targetLanguage}
            voiceEnabled={entitlements.config.features.voice_transcription}
            voiceRemainingMinutes={voiceQuota.remaining}
            voiceLimitMinutes={voiceQuota.limit}
          />
          <ConversationFinish sessionId={session.id} />
        </>
      ) : summary?.success ? (
        <>
          <section className="conversation-score-grid grid uv-grid-template-columns-dd0b1a1848 uv-border-8d7f82f403 rounded-uv-rd65225386d overflow-hidden uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-0.75 uv-vcbb57f4d35:p-3.25 uv-v3de32a793f:uv-border-right-8d7f82f403 uv-v907ac4759b:uv-border-bottom-8d7f82f403 uv-veda02a0adb:uv-font-family-320794573f uv-veda02a0adb:text-uv-f081acf2896 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f78eb7000a9 uv-min620:uv-grid-template-columns-0cbc4f103a uv-min620:uv-vcbb57f4d35:uv-border-right-b6589fc6ab uv-min620:uv-vcbb57f4d35:uv-border-bottom-b6589fc6ab uv-min620:uv-v3de32a793f:uv-border-right-b6589fc6ab uv-min620:uv-v3de32a793f:uv-border-bottom-b6589fc6ab uv-min620:uv-v907ac4759b:uv-border-right-b6589fc6ab uv-min620:uv-v907ac4759b:uv-border-bottom-b6589fc6ab uv-min620:uv-v5007062a75:uv-border-left-8d7f82f403">
            <div>
              <strong>{formatPercent(locale, summary.data.overallScore)}</strong>
              <span>{t("conversation.detail.score.overall")}</span>
            </div>
            <div>
              <strong>{formatPercent(locale, summary.data.grammarScore)}</strong>
              <span>{t("conversation.detail.score.grammar")}</span>
            </div>
            <div>
              <strong>
                {formatPercent(locale, summary.data.naturalnessScore)}
              </strong>
              <span>{t("conversation.detail.score.naturalness")}</span>
            </div>
            <div>
              <strong>
                {formatPercent(locale, summary.data.vocabularyScore)}
              </strong>
              <span>{t("conversation.detail.score.vocabulary")}</span>
            </div>
          </section>

          {session.kind === "MISSION" ? (
            <section
              className={
                "mission-result flex items-start gap-2.5 uv-padding-fed09d08e0 uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface-raised uv-v872d6ea02a:uv-flex-18ba0b6e31 uv-v872d6ea02a:mt-0.5 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:uv-line-height-2792cf2449 uv-v03d79f50fa:border-uv-c126ca15671 uv-v03d79f50fa:bg-uv-cb0392f6948 uv-v7816860752:text-uv-success uv-v3499e844b5:border-uv-cfc300cc991 uv-v3499e844b5:bg-uv-c7322cb8d99 uv-v78a70b7303:text-uv-danger " +
                (summary.data.taskSuccess ? "is-success" : "is-incomplete")
              }
            >
              {summary.data.taskSuccess ? (
                <CheckCircle2 size={20} />
              ) : (
                <XCircle size={20} />
              )}
              <div>
                <strong>
                  {summary.data.taskSuccess
                    ? t("conversation.detail.missionSuccess")
                    : t("conversation.detail.missionIncomplete")}
                </strong>
                <span className="learning-content" dir="auto">
                  {summary.data.summary}
                </span>
              </div>
            </section>
          ) : (
            <section className="panel conversation-summary uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 uv-vd9a40650be:mb-0 uv-vd9a40650be:uv-line-height-05c248da4c rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("conversation.detail.summary")}</p>
              <p className="learning-content" dir="auto">
                {summary.data.summary}
              </p>
            </section>
          )}

          <section className="conversation-result-grid flex flex-col gap-3.5 uv-v10010674ad:uv-margin-86ddfb81a1 uv-v10010674ad:pl-4.5 uv-vbc8f6c01a9:uv-margin-c37400d7c5 uv-vbc8f6c01a9:text-uv-text-soft uv-vbc8f6c01a9:uv-line-height-2792cf2449 uv-min620:grid uv-min620:uv-grid-template-columns-dd0b1a1848">
            <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("conversation.detail.strengths")}</p>
              <ul>
                {summary.data.strengths.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("conversation.detail.improveNext")}</p>
              <ul>
                {summary.data.improvements.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="panel conversation-target-results uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 rounded-uv-r6d27d54c6c">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("conversation.detail.targetResults")}</p>
            {summary.data.targetResults.map((result) => {
              const target = session.targets.find(
                (item) => item.lexemeId === result.lexemeId,
              );
              return (
                <div className="target-result-row flex flex-col gap-2.25 uv-padding-3da68d188d uv-border-bottom-8d7f82f403 last:uv-border-bottom-b6589fc6ab uv-v0fee2d502c:flex uv-v0fee2d502c:flex-col uv-v0fee2d502c:gap-0.75 uv-v1c155e3be2:text-uv-text-muted uv-v1c155e3be2:uv-line-height-a26f83404b uv-min620:grid uv-min620:uv-grid-template-columns-f06dd92ea5 uv-min620:items-center" key={result.lexemeId}>
                  <div>
                    <strong className="learning-content" lang="de" dir="ltr">
                      {target?.lexeme.lemma ?? t("conversation.detail.targetWord")}
                    </strong>
                    <span className="learning-content" dir="auto">
                      {result.note}
                    </span>
                  </div>
                  <div className="target-result-status flex flex-wrap gap-1.5 uv-v36c0309a03:uv-padding-b9d3ef7fdf uv-v36c0309a03:uv-border-8d7f82f403 uv-v36c0309a03:rounded-uv-red9ab892c5 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f2311a7d95c">
                    <span>
                      {result.used
                        ? t("conversation.detail.used")
                        : t("conversation.detail.missed")}
                    </span>
                    <span>
                      {result.correct
                        ? t("conversation.detail.correct")
                        : t("conversation.detail.needsWork")}
                    </span>
                    <span>
                      {t("conversation.detail.natural", {
                        percent: formatPercent(locale, result.naturalness),
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>

          <ConversationReplay sessionId={session.id} kind={session.kind} />
        </>
      ) : (
        <div className="empty-state flex flex-col gap-3 items-start p-6 uv-border-c8a81946fb rounded-uv-r02a0a889dd text-uv-text-soft">
          <strong>{t("conversation.detail.unreadable")}</strong>
        </div>
      )}
    </main>
  );
}
