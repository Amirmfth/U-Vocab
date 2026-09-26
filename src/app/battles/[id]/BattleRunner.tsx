"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();
  const firstUnanswered = questions.findIndex((question) => !question.answer);
  const [index, setIndex] = useState(
    firstUnanswered === -1 ? questions.length : firstUnanswered,
  );
  const [score, setScore] = useState(initialScore);
  const [answered, setAnswered] = useState(() => questions.filter((question) => question.answer).length);
  const [selected, setSelected] = useState<string | null>(null);
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

  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => {
      if (index + 1 >= questions.length) {
        startTransition(async () => {
          await completeBattle(sessionId);
          router.refresh();
        });
        return;
      }
      setResult(null);
      setSelected(null);
      setIndex((value) => value + 1);
      questionStartedAt.current = Date.now();
    }, result.correct ? 800 : 1100);
    return () => window.clearTimeout(timer);
  }, [index, questions.length, result, router, sessionId]);

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
    setSelected(answer);
    const responseMs = Date.now() - questionStartedAt.current;

    startTransition(async () => {
      const response = await answerBattleQuestion({
        sessionId,
        questionId: current.id,
        answer,
        responseMs,
      });
      setScore((value) => value + response.points);
      setAnswered((value) => value + 1);
      setResult(response);
    });
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

      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          key={current.id}
          className="panel battle-question-card"
          initial={reduceMotion ? false : { opacity: 0, x: 30, scale: 0.99 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -36, scale: 0.985 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        >
          <h2>{current.prompt}</h2>

          <div className="battle-options">
            {current.options.map((option) => {
              const isCorrect = Boolean(result) && option === result?.expected;
              const isWrong = Boolean(result) && selected === option && !result?.correct;
              return (
                <button
                  type="button"
                  className={[
                    "battle-option",
                    selected === option ? "is-selected" : "",
                    isCorrect ? "is-correct" : "",
                    isWrong ? "is-wrong" : "",
                  ].filter(Boolean).join(" ")}
                  key={option}
                  disabled={pending || Boolean(result)}
                  onClick={() => choose(option)}
                >
                  <span>{option}</span>
                  {isCorrect ? <CheckCircle2 size={18} /> : isWrong ? <XCircle size={18} /> : null}
                </button>
              );
            })}
          </div>

          {pending && !result ? (
            <div className="battle-feedback is-pending" role="status">
              <span>Checking…</span>
            </div>
          ) : null}

          {result ? (
            <div className={"battle-feedback " + (result.correct ? "is-correct" : "is-wrong")} role="status">
              {result.correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              <div>
                <strong>
                  {result.correct
                    ? "+" + result.points + " points"
                    : "Correct: " + result.expected}
                </strong>
                <span>
                  {result.explanation ?? "Next question…"}
                </span>
              </div>
            </div>
          ) : null}
        </motion.article>
      </AnimatePresence>
    </section>
  );
}
