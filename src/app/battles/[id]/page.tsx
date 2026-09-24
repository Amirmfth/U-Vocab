import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { BattleRunner } from "./BattleRunner";


export default async function BattlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const session = await db.battleSession.findFirst({
    where: { id, userId: user.id },
    include: {
      questions: { orderBy: { position: "asc" } },
    },
  });

  if (!session) notFound();

  const options = session.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: Array.isArray(question.options)
      ? question.options.filter((item): item is string => typeof item === "string")
      : [],
    expected: question.expected,
    explanation: question.explanation,
    answer: question.answer,
    correct: question.correct,
  }));

  if (session.completedAt) {
    const answered = session.questions.filter((question) => question.answeredAt).length;
    const accuracy = answered
      ? Math.round((session.correct / answered) * 100)
      : 0;

    return (
      <main className="page">
        <section className="page-header compact">
          <Link href="/battles" className="back-link">
            <ArrowLeft size={16} />
            Battles
          </Link>
          <CheckCircle2 size={28} />
          <p className="eyebrow">RESULT</p>
          <h1>{session.score} points</h1>
          <p className="page-description">
            {session.correct}/{answered} correct · {accuracy}% accuracy
          </p>
        </section>

        <section className="battle-result-list">
          {session.questions.map((question) => (
            <article className="battle-result-row" key={question.id}>
              <div>
                <strong>{question.prompt}</strong>
                <span>
                  {question.correct ? "correct" : "expected " + question.expected}
                </span>
              </div>
              <span>{question.responseMs ? Math.round(question.responseMs / 100) / 10 + "s" : "—"}</span>
            </article>
          ))}
        </section>

        <Link href="/battles" className="button button-primary">
          Play another
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="page-header compact">
        <Link href="/battles" className="back-link">
          <ArrowLeft size={16} />
          Battles
        </Link>
        <p className="eyebrow">{session.game.replaceAll("_", " ")}</p>
        <h1>Battle</h1>
      </section>

      <BattleRunner
        sessionId={session.id}
        mode={session.mode}
        durationSec={session.durationSec}
        startedAt={session.startedAt.toISOString()}
        initialScore={session.score}
        questions={options}
      />
    </main>
  );
}
