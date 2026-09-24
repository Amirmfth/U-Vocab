import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Target, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { conversationFinalEvaluationSchema } from "@/lib/ai/conversation-final-evaluator";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ConversationChat } from "../ConversationChat";
import {
  ConversationFinish,
  ConversationReplay,
} from "../ConversationFinish";


function percent(value: number) {
  return Math.round(value * 100);
}

export default async function ConversationSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const session = await db.conversationSession.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      targets: {
        include: { lexeme: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!session) notFound();

  const backHref = session.kind === "MISSION" ? "/missions" : "/conversation";
  const summary = session.summary
    ? conversationFinalEvaluationSchema.safeParse(session.summary)
    : null;

  return (
    <main className="page conversation-page">
      <section className="page-header compact">
        <Link href={backHref} className="back-link">
          <ArrowLeft size={16} />
          {session.kind === "MISSION" ? "Missions" : "Conversation"}
        </Link>

        <div className="word-meta">
          <span className="badge">{session.kind.toLowerCase()}</span>
          <span className="badge">{session.level}</span>
          <span className="badge">{session.status.toLowerCase()}</span>
        </div>

        <h1>{session.title}</h1>
        <p className="page-description">{session.scenario}</p>

        {session.objective ? (
          <div className="mission-objective">
            <Target size={18} />
            <div>
              <strong>Objective</strong>
              <span>{session.objective}</span>
            </div>
          </div>
        ) : null}
      </section>

      {(session.revealTargets || session.status === "COMPLETED") ? (
        <section className="conversation-targets" aria-label="Target vocabulary">
          {session.targets.map((target) => (
            <div
              className={
                "conversation-target " +
                (target.successfulUses > 0 ? "is-used" : "")
              }
              key={target.id}
            >
              <span>
                {target.lexeme.article ? target.lexeme.article + " " : ""}
                {target.lexeme.lemma}
              </span>
              <small>
                {target.successfulUses}/{target.uses} correct uses
              </small>
            </div>
          ))}
        </section>
      ) : (
        <p className="secret-target-note">
          Target vocabulary is hidden for this mission.
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
          />
          <ConversationFinish sessionId={session.id} />
        </>
      ) : summary?.success ? (
        <>
          <section className="conversation-score-grid">
            <div>
              <strong>{percent(summary.data.overallScore)}%</strong>
              <span>overall</span>
            </div>
            <div>
              <strong>{percent(summary.data.grammarScore)}%</strong>
              <span>grammar</span>
            </div>
            <div>
              <strong>{percent(summary.data.naturalnessScore)}%</strong>
              <span>naturalness</span>
            </div>
            <div>
              <strong>{percent(summary.data.vocabularyScore)}%</strong>
              <span>vocabulary</span>
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
                    ? "Mission accomplished"
                    : "Mission not completed"}
                </strong>
                <span>{summary.data.summary}</span>
              </div>
            </section>
          ) : (
            <section className="panel conversation-summary">
              <p className="eyebrow">SESSION SUMMARY</p>
              <p>{summary.data.summary}</p>
            </section>
          )}

          <section className="conversation-result-grid">
            <article className="panel">
              <p className="eyebrow">STRENGTHS</p>
              <ul>
                {summary.data.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="panel">
              <p className="eyebrow">IMPROVE NEXT</p>
              <ul>
                {summary.data.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>

          <section className="panel conversation-target-results">
            <p className="eyebrow">TARGET RESULTS</p>
            {summary.data.targetResults.map((result) => {
              const target = session.targets.find(
                (item) => item.lexemeId === result.lexemeId,
              );
              return (
                <div className="target-result-row" key={result.lexemeId}>
                  <div>
                    <strong>{target?.lexeme.lemma ?? "Target word"}</strong>
                    <span>{result.note}</span>
                  </div>
                  <div className="target-result-status">
                    <span>{result.used ? "used" : "missed"}</span>
                    <span>{result.correct ? "correct" : "needs work"}</span>
                    <span>{percent(result.naturalness)}% natural</span>
                  </div>
                </div>
              );
            })}
          </section>

          <ConversationReplay sessionId={session.id} kind={session.kind} />
        </>
      ) : (
        <div className="empty-state">
          <strong>Session result could not be read.</strong>
        </div>
      )}
    </main>
  );
}
