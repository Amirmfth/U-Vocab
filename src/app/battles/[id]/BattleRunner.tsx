"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { answerBattleQuestion, completeBattle } from "../actions";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  expected: string;
  explanation: string | null;
  answer: string | null;
  correct: boolean | null;
};

export function BattleRunner({
  sessionId,
  mode,
  durationSec,
  startedAt,
  initialScore,
  questions,
}: {
  sessionId: string;
  mode: "TIMED" | "UNTIMED";
  durationSec: number | null;
  startedAt: string;
  initialScore: number;
  questions: Question[];
}) {
  const router = useRouter();
  const firstUnanswered = questions.findIndex((question) => !question.answer);
  const [index, setIndex] = useState(
    firstUnanswered === -1 ? questions.length : firstUnanswered,
  );
  const [score, setScore] = useState(initialScore);
  const [result, setResult] = useState<{
    correct: boolean;
    expected: string;
    explanation: string | null;
    points: number;
  } | null>(null);
  const [remaining, setRemaining] = useState(() => {
    if (!durationSec) return 0;
    const elapsed = Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / 1000,
    );
    return Math.max(0, durationSec - elapsed);
  });
  const [pending, startTransition] = useTransition();
  const questionStartedAt = useRef(Date.now());
  const current = questions[index];

  const answered = useMemo(
    () => questions.filter((question) => question.answer).length + (result ? 1 : 0),
    [questions, result],
  );

  useEffect(() => {
    if (mode !== "TIMED" || !durationSec || index >= questions.length) return;

    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          startTransition(async () => {
            await completeBattle(sessionId);
            router.refresh();
          });
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [durationSec, index, mode, questions.length, router, sessionId]);

  if (!current || (mode === "TIMED" && remaining <= 0)) {
    return (
      <section className="panel battle-finished">
        <p className="eyebrow">BATTLE COMPLETE</p>
        <h2>{score} points</h2>
        <p className="muted">
          {Math.min(answered, questions.length)} / {questions.length} answered
        </p>
        <button
          type="button"
          className="button button-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await completeBattle(sessionId);
              router.refresh();
            })
          }
        >
          View results
        </button>
      </section>
    );
  }

  async function choose(answer: string) {
    if (pending || result) return;
    const responseMs = Date.now() - questionStartedAt.current;

    startTransition(async () => {
      const response = await answerBattleQuestion({
        sessionId,
        questionId: current.id,
        answer,
        responseMs,
      });
      setScore((value) => value + response.points);
      setResult(response);
    });
  }

  function next() {
    setResult(null);
    setIndex((value) => value + 1);
    questionStartedAt.current = Date.now();
  }

  return (
    <section className="battle-runner">
      <div className="battle-hud">
        <span>{index + 1}/{questions.length}</span>
        <strong>{score} pts</strong>
        {mode === "TIMED" ? (
          <span className="battle-timer"><Clock3 size={15} /> {remaining}s</span>
        ) : (
          <span>untimed</span>
        )}
      </div>

      <article className="panel battle-question-card">
        <h2>{current.prompt}</h2>

        <div className="battle-options">
          {current.options.map((option) => (
            <button
              type="button"
              className="battle-option"
              key={option}
              disabled={pending || Boolean(result)}
              onClick={() => choose(option)}
            >
              {option}
            </button>
          ))}
        </div>

        {result ? (
          <div className={"battle-feedback " + (result.correct ? "is-correct" : "is-wrong")}>
            {result.correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <div>
              <strong>
                {result.correct
                  ? "+" + result.points + " points"
                  : "Expected: " + result.expected}
              </strong>
              {result.explanation ? <span>{result.explanation}</span> : null}
            </div>
          </div>
        ) : null}

        {result ? (
          <button type="button" className="button button-primary" onClick={next}>
            {index + 1 >= questions.length ? "Finish" : "Next"}
          </button>
        ) : null}
      </article>
    </section>
  );
}
