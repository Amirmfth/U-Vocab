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
    <main className="page conversation-page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
      <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]">
        <Link href="/conversation" className="back-link [width:fit-content] [min-height:40px] [display:inline-flex] [align-items:center] [gap:7px] [color:var(--text-muted)] [font-size:0.82rem]">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("conversation.detail.back")}
        </Link>

        <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
            {session.kind === "MISSION"
              ? t("conversation.mission")
              : t("conversation.conversation")}
          </span>
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{session.level}</span>
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
            {session.status === "COMPLETED"
              ? t("conversation.detail.status.completed")
              : t("conversation.detail.status.active")}
          </span>
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
            {t(toneKeys[session.tone] ?? "conversation.detail.tone.friendly")}
          </span>
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{formalityLabel}</span>
        </div>

        <h1 className="learning-content" dir="auto">{session.title}</h1>
        <p className="page-description learning-content [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]" lang="de" dir="ltr">
          {session.scenario}
        </p>

        {session.objective ? (
          <div className="mission-objective [display:flex] [align-items:flex-start] [gap:10px] [padding:12px_13px] [border:1px_solid_var(--border)] [border-radius:13px] [background:var(--surface-raised)] [&_>_svg]:[flex:0_0_auto] [&_>_svg]:[margin-top:2px] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:3px] [&_span]:[color:var(--text-muted)] [&_span]:[line-height:1.45]">
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
          className="conversation-targets [display:flex] [gap:7px] [overflow-x:auto] [padding-bottom:3px]"
          aria-label={t("conversation.detail.targets")}
        >
          {session.targets.map((target) => (
            <div
              className={
                "conversation-target [min-width:max-content] [display:flex] [flex-direction:column] [gap:2px] [padding:7px_10px] [border:1px_solid_var(--border)] [border-radius:11px] [background:var(--surface)] [&_>_span]:[font-size:0.78rem] [&_>_span]:[font-weight:650] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.62rem] [&.is-used]:[border-color:rgba(73,_201,_139,_0.28)] [&.is-used]:[background:rgba(73,_201,_139,_0.07)] " +
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
        <p className="secret-target-note [margin:0] [color:var(--text-muted)] [font-size:0.75rem]">
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
          <section className="conversation-score-grid [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [border:1px_solid_var(--border)] [border-radius:14px] [overflow:hidden] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:3px] [&_>_div]:[padding:13px] [&_>_div:nth-child(odd)]:[border-right:1px_solid_var(--border)] [&_>_div:nth-child(-n_+_2)]:[border-bottom:1px_solid_var(--border)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_strong]:[font-size:1.25rem] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.68rem] min-[620px]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] min-[620px]:[&_>_div]:[border-right:0] min-[620px]:[&_>_div]:[border-bottom:0] min-[620px]:[&_>_div:nth-child(odd)]:[border-right:0] min-[620px]:[&_>_div:nth-child(odd)]:[border-bottom:0] min-[620px]:[&_>_div:nth-child(-n_+_2)]:[border-right:0] min-[620px]:[&_>_div:nth-child(-n_+_2)]:[border-bottom:0] min-[620px]:[&_>_div_+_div]:[border-left:1px_solid_var(--border)]">
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
                "mission-result [display:flex] [align-items:flex-start] [gap:10px] [padding:12px_13px] [border:1px_solid_var(--border)] [border-radius:13px] [background:var(--surface-raised)] [&_>_svg]:[flex:0_0_auto] [&_>_svg]:[margin-top:2px] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:3px] [&_span]:[color:var(--text-muted)] [&_span]:[line-height:1.45] [&.is-success]:[border-color:rgba(73,_201,_139,_0.28)] [&.is-success]:[background:rgba(73,_201,_139,_0.08)] [&.is-success_>_svg]:[color:var(--success)] [&.is-incomplete]:[border-color:rgba(255,_107,_122,_0.24)] [&.is-incomplete]:[background:rgba(255,_107,_122,_0.06)] [&.is-incomplete_>_svg]:[color:var(--danger)] " +
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
            <section className="panel conversation-summary [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [&_>_p:last-child]:[margin-bottom:0] [&_>_p:last-child]:[line-height:1.55] [border-radius:18px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("conversation.detail.summary")}</p>
              <p className="learning-content" dir="auto">
                {summary.data.summary}
              </p>
            </section>
          )}

          <section className="conversation-result-grid [display:flex] [flex-direction:column] [gap:14px] [&_ul]:[margin:8px_0_0] [&_ul]:[padding-left:18px] [&_li]:[margin:6px_0] [&_li]:[color:var(--text-soft)] [&_li]:[line-height:1.45] min-[620px]:[display:grid] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
            <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("conversation.detail.strengths")}</p>
              <ul>
                {summary.data.strengths.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("conversation.detail.improveNext")}</p>
              <ul>
                {summary.data.improvements.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="panel conversation-target-results [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [border-radius:18px]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("conversation.detail.targetResults")}</p>
            {summary.data.targetResults.map((result) => {
              const target = session.targets.find(
                (item) => item.lexemeId === result.lexemeId,
              );
              return (
                <div className="target-result-row [display:flex] [flex-direction:column] [gap:9px] [padding:12px_0] [border-bottom:1px_solid_var(--border)] [&:last-child]:[border-bottom:0] [&_>_div:first-child]:[display:flex] [&_>_div:first-child]:[flex-direction:column] [&_>_div:first-child]:[gap:3px] [&_>_div:first-child_span]:[color:var(--text-muted)] [&_>_div:first-child_span]:[line-height:1.4] min-[620px]:[display:grid] min-[620px]:[grid-template-columns:minmax(0,_1fr)_auto] min-[620px]:[align-items:center]" key={result.lexemeId}>
                  <div>
                    <strong className="learning-content" lang="de" dir="ltr">
                      {target?.lexeme.lemma ?? t("conversation.detail.targetWord")}
                    </strong>
                    <span className="learning-content" dir="auto">
                      {result.note}
                    </span>
                  </div>
                  <div className="target-result-status [display:flex] [flex-wrap:wrap] [gap:6px] [&_span]:[padding:4px_7px] [&_span]:[border:1px_solid_var(--border)] [&_span]:[border-radius:999px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.65rem]">
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
        <div className="empty-state [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [padding:24px] [border:1px_dashed_var(--border-strong)] [border-radius:var(--radius-lg)] [color:var(--text-soft)]">
          <strong>{t("conversation.detail.unreadable")}</strong>
        </div>
      )}
    </main>
  );
}
