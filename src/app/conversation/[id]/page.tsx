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
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem">
        <Link href="/conversation" className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-exact-0p82rem">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("conversation.detail.back")}
        </Link>

        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">
            {session.kind === "MISSION"
              ? t("conversation.mission")
              : t("conversation.conversation")}
          </span>
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">{session.level}</span>
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">
            {session.status === "COMPLETED"
              ? t("conversation.detail.status.completed")
              : t("conversation.detail.status.active")}
          </span>
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">
            {t(toneKeys[session.tone] ?? "conversation.detail.tone.friendly")}
          </span>
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">{formalityLabel}</span>
        </div>

        <h1 className="learning-content" dir="auto">{session.title}</h1>
        <p className="page-description learning-content m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65" lang="de" dir="ltr">
          {session.scenario}
        </p>

        {session.objective ? (
          <div className="mission-objective flex items-start gap-2.5 padding-12px-13px border-1px-solid-border-2 rounded-exact-13px bg-uv-surface-raised in-svg:flex-0-0-auto in-svg:mt-0.5 in-div:flex in-div:flex-col in-div:gap-0.75 in-span:text-uv-text-muted in-span:line-height-1p45">
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
                "conversation-target min-width-max-content flex flex-col gap-0.5 padding-7px-10px border-1px-solid-border-2 rounded-exact-11px bg-uv-surface in-span-2:text-exact-0p78rem in-span-2:font-650 in-small:text-uv-text-muted in-small:text-exact-0p62rem in-is-used:border-uv-c126ca15671 in-is-used:bg-uv-c3bbdd32fbd " +
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
        <p className="secret-target-note m-0 text-uv-text-muted text-exact-0p75rem">
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
          <section className="conversation-score-grid grid grid-template-columns-repeat-2-minmax-0-1fr border-1px-solid-border-2 rounded-exact-14px overflow-hidden in-div:flex in-div:flex-col in-div:gap-0.75 in-div:p-3.25 in-div-nth-child-odd:border-1px-solid-border-4 in-div-nth-child-n-2:border-1px-solid-border in-strong-2:font-font-geist-mono-geist-mono-monospace in-strong-2:text-exact-1p25rem in-span:text-uv-text-muted in-span:text-exact-0p68rem uv-min620:grid-template-columns-repeat-4-minmax-0-1fr uv-min620:in-div:border-0-2 uv-min620:in-div:border-0-3 uv-min620:in-div-nth-child-odd:border-0-2 uv-min620:in-div-nth-child-odd:border-0-3 uv-min620:in-div-nth-child-n-2:border-0-2 uv-min620:in-div-nth-child-n-2:border-0-3 uv-min620:in-div-div:border-1px-solid-border-5">
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
                "mission-result flex items-start gap-2.5 padding-12px-13px border-1px-solid-border-2 rounded-exact-13px bg-uv-surface-raised in-svg:flex-0-0-auto in-svg:mt-0.5 in-div:flex in-div:flex-col in-div:gap-0.75 in-span:text-uv-text-muted in-span:line-height-1p45 in-is-success:border-uv-c126ca15671 in-is-success:bg-uv-cb0392f6948 in-is-success-svg:text-uv-success in-is-incomplete:border-uv-cfc300cc991 in-is-incomplete:bg-uv-c7322cb8d99 in-is-incomplete-svg:text-uv-danger " +
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
            <section className="panel conversation-summary border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 in-p-last-child:mb-0 in-p-last-child:line-height-1p55 rounded-exact-18px">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("conversation.detail.summary")}</p>
              <p className="learning-content" dir="auto">
                {summary.data.summary}
              </p>
            </section>
          )}

          <section className="conversation-result-grid flex flex-col gap-3.5 in-ul:margin-8px-0-0 in-ul:pl-4.5 in-li:margin-6px-0 in-li:text-uv-text-soft in-li:line-height-1p45 uv-min620:grid uv-min620:grid-template-columns-repeat-2-minmax-0-1fr">
            <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("conversation.detail.strengths")}</p>
              <ul>
                {summary.data.strengths.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("conversation.detail.improveNext")}</p>
              <ul>
                {summary.data.improvements.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="panel conversation-target-results border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 rounded-exact-18px">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("conversation.detail.targetResults")}</p>
            {summary.data.targetResults.map((result) => {
              const target = session.targets.find(
                (item) => item.lexemeId === result.lexemeId,
              );
              return (
                <div className="target-result-row flex flex-col gap-2.25 padding-12px-0 border-1px-solid-border last:border-0-3 in-div-first-child:flex in-div-first-child:flex-col in-div-first-child:gap-0.75 in-div-first-child-span:text-uv-text-muted in-div-first-child-span:line-height-1p4 uv-min620:grid uv-min620:grid-template-columns-minmax-0-1fr-auto uv-min620:items-center" key={result.lexemeId}>
                  <div>
                    <strong className="learning-content" lang="de" dir="ltr">
                      {target?.lexeme.lemma ?? t("conversation.detail.targetWord")}
                    </strong>
                    <span className="learning-content" dir="auto">
                      {result.note}
                    </span>
                  </div>
                  <div className="target-result-status flex flex-wrap gap-1.5 in-span:padding-4px-7px in-span:border-1px-solid-border-2 in-span:rounded-exact-999px in-span:text-uv-text-muted in-span:text-exact-0p65rem">
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
        <div className="empty-state flex flex-col gap-3 items-start p-6 border-1px-dashed-border-strong rounded-exact-radius-lg text-uv-text-soft">
          <strong>{t("conversation.detail.unreadable")}</strong>
        </div>
      )}
    </main>
  );
}
