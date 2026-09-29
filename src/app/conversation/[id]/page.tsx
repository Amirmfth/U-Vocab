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
    <main className="page conversation-page">
      <section className="page-header compact">
        <Link href="/conversation" className="back-link">
          <ArrowLeft className="rtl-mirror" size={16} />
          {t("conversation.detail.back")}
        </Link>

        <div className="word-meta">
          <span className="badge">
            {session.kind === "MISSION"
              ? t("conversation.mission")
              : t("conversation.conversation")}
          </span>
          <span className="badge">{session.level}</span>
          <span className="badge">
            {session.status === "COMPLETED"
              ? t("conversation.detail.status.completed")
              : t("conversation.detail.status.active")}
          </span>
          <span className="badge">
            {t(toneKeys[session.tone] ?? "conversation.detail.tone.friendly")}
          </span>
          <span className="badge">{formalityLabel}</span>
        </div>

        <h1 className="learning-content" dir="auto">{session.title}</h1>
        <p className="page-description learning-content" lang="de" dir="ltr">
          {session.scenario}
        </p>

        {session.objective ? (
          <div className="mission-objective">
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
          className="conversation-targets"
          aria-label={t("conversation.detail.targets")}
        >
          {session.targets.map((target) => (
            <div
              className={
                "conversation-target " +
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
        <p className="secret-target-note">
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
          />
          <ConversationFinish sessionId={session.id} />
        </>
      ) : summary?.success ? (
        <>
          <section className="conversation-score-grid">
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
                "mission-result " +
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
            <section className="panel conversation-summary">
              <p className="eyebrow">{t("conversation.detail.summary")}</p>
              <p className="learning-content" dir="auto">
                {summary.data.summary}
              </p>
            </section>
          )}

          <section className="conversation-result-grid">
            <article className="panel">
              <p className="eyebrow">{t("conversation.detail.strengths")}</p>
              <ul>
                {summary.data.strengths.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel">
              <p className="eyebrow">{t("conversation.detail.improveNext")}</p>
              <ul>
                {summary.data.improvements.map((item) => (
                  <li className="learning-content" dir="auto" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="panel conversation-target-results">
            <p className="eyebrow">{t("conversation.detail.targetResults")}</p>
            {summary.data.targetResults.map((result) => {
              const target = session.targets.find(
                (item) => item.lexemeId === result.lexemeId,
              );
              return (
                <div className="target-result-row" key={result.lexemeId}>
                  <div>
                    <strong className="learning-content" lang="de" dir="ltr">
                      {target?.lexeme.lemma ?? t("conversation.detail.targetWord")}
                    </strong>
                    <span className="learning-content" dir="auto">
                      {result.note}
                    </span>
                  </div>
                  <div className="target-result-status">
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
        <div className="empty-state">
          <strong>{t("conversation.detail.unreadable")}</strong>
        </div>
      )}
    </main>
  );
}
