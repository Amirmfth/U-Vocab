"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const questionStartedAt = useRef(Date.now());
  const pendingSaves = useRef(new Set<Promise<unknown>>());
  const current = questions[index];

  const finishBattle = useCallback(async () => {
    // A locally graded final answer may still be on its way to the server.
    // Finish only after those writes have settled so it is included in results.
    await Promise.allSettled([...pendingSaves.current]);
    await completeBattle(sessionId);
    router.refresh();
  }, [router, sessionId]);

  useEffect(() => {
    if (mode !== "TIMED" || !durationSec || index >= questions.length) return;

    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          startTransition(async () => {
            await finishBattle();
          });
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [durationSec, finishBattle, index, mode, questions.length]);

  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => {
      if (index + 1 >= questions.length) {
        startTransition(async () => {
          await finishBattle();
        });
        return;
      }
      setResult(null);
      setSelected(null);
      setIndex((value) => value + 1);
      questionStartedAt.current = Date.now();
    }, result.correct ? 800 : 1100);
    return () => window.clearTimeout(timer);
  }, [finishBattle, index, questions.length, result]);

  if (!current || (mode === "TIMED" && remaining <= 0)) {
    return (
      <section className="panel battle-finished border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-4.5 in-h2:m-0 in-h2:text-uv-fd69b9c5786 in-h2:line-height-1p25 in-h2:letter-spacing-0p035em rounded-uv-r6d27d54c6c">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">BATTLE COMPLETE</p>
        <h2>{score} points</h2>
        <p className="muted text-uv-text-muted">
          {Math.min(answered, questions.length)} / {questions.length} answered
        </p>
        <button
          type="button"
          className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await finishBattle();
            })
          }
        >
          View results
        </button>
      </section>
    );
  }

  function choose(answer: string) {
    if (pending || result) return;
    setSelected(answer);
    const responseMs = Date.now() - questionStartedAt.current;

    const correct =
      current.expected.trim().toLocaleLowerCase("de-DE") ===
      answer.trim().toLocaleLowerCase("de-DE");
    const points = correct
      ? 100 + (mode === "TIMED" ? Math.max(0, 50 - Math.floor(responseMs / 200)) : 0)
      : 0;
    setScore((value) => value + points);
    setAnswered((value) => value + 1);
    setResult({
      correct,
      expected: current.expected,
      explanation: current.explanation,
      points,
    });

    // The question's expected answer is loaded with the question, so feedback
    // can be shown immediately. The server recomputes it before persistence.
    startTransition(() => {
      const save = answerBattleQuestion({
        sessionId,
        questionId: current.id,
        answer,
        responseMs,
      }).catch(() => {
        setSaveError("Your feedback was shown, but this answer could not be saved.");
      });
      pendingSaves.current.add(save);
      void save.finally(() => pendingSaves.current.delete(save));
    });
  }

  return (
    <section className="battle-runner flex flex-col gap-3.5">
      <div className="battle-hud grid grid-template-columns-1fr-auto-1fr items-center gap-2.5 min-h-10.5 padding-0-2px text-uv-text-muted text-uv-f823f1262bd in-strong-2:text-uv-text in-strong-2:font-font-geist-mono-geist-mono-monospace in-strong-2:text-uv-f19feeb881c in-last-child:justify-self-end">
        <span>{index + 1}/{questions.length}</span>
        <strong>{score} pts</strong>
        {mode === "TIMED" ? (
          <span className="battle-timer inline-flex items-center gap-1.25"><Clock3 size={15} /> {remaining}s</span>
        ) : (
          <span>untimed</span>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          key={current.id}
          className="panel battle-question-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-4.5 in-h2:m-0 in-h2:text-uv-fd69b9c5786 in-h2:line-height-1p25 in-h2:letter-spacing-0p035em rounded-uv-r6d27d54c6c"
          initial={reduceMotion ? false : { opacity: 0, x: 30, scale: 0.99 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -36, scale: 0.985 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        >
          <h2>{current.prompt}</h2>

          <div className="battle-options grid grid-template-columns-1fr gap-2.5 uv-min620:grid-template-columns-repeat-2-minmax-0-1fr">
            {current.options.map((option) => {
              const isCorrect = Boolean(result) && option === result?.expected;
              const isWrong = Boolean(result) && selected === option && !result?.correct;
              return (
                <button
                  type="button"
                  className={[
                    "battle-option font-inherit min-h-14.5 w-full flex items-center justify-between gap-3 padding-13px-15px border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface text-uv-text text-left cursor-pointer transition-transform-140ms-ease-border-color-140ms-ease-backgro in-hover-not-disabled:border-uv-border-strong in-hover-not-disabled:bg-uv-surface-raised in-hover-not-disabled:transform-translatey-1px in-focus-visible-not-disabled:border-uv-border-strong in-focus-visible-not-disabled:bg-uv-surface-raised in-focus-visible-not-disabled:transform-translatey-1px disabled:cursor-default in-is-selected:border-uv-border-strong in-is-selected:bg-uv-surface-raised in-is-correct:border-uv-success in-is-correct:bg-uv-cafddaf6a65 in-is-wrong:border-uv-danger in-is-wrong:bg-uv-c8b3083dabe in-is-correct-svg:text-uv-success in-is-wrong-svg:text-uv-danger",
                    selected === option ? "is-selected" : "",
                    isCorrect ? "is-correct" : "",
                    isWrong ? "is-wrong" : "",
                  ].filter(Boolean).join(" ")}
                  key={option}
                  disabled={Boolean(result)}
                  onClick={() => choose(option)}
                >
                  <span>{option}</span>
                  {isCorrect ? <CheckCircle2 size={18} /> : isWrong ? <XCircle size={18} /> : null}
                </button>
              );
            })}
          </div>

          {saveError ? <div className="battle-feedback is-wrong flex items-start gap-2.25 p-3 rounded-uv-r0939007802 in-is-correct:bg-uv-cb0392f6948 in-is-correct:text-uv-success in-is-wrong:bg-uv-c8ae00eb793 in-is-wrong:text-uv-danger in-div:flex in-div:flex-col in-div:gap-0.75 in-span:text-uv-text-muted in-span:line-height-1p4 in-is-pending:text-uv-text-muted in-is-pending:bg-uv-surface-raised" role="status">{saveError}</div> : null}

          {result ? (
            <div className={"battle-feedback flex items-start gap-2.25 p-3 rounded-uv-r0939007802 in-is-correct:bg-uv-cb0392f6948 in-is-correct:text-uv-success in-is-wrong:bg-uv-c8ae00eb793 in-is-wrong:text-uv-danger in-div:flex in-div:flex-col in-div:gap-0.75 in-span:text-uv-text-muted in-span:line-height-1p4 in-is-pending:text-uv-text-muted in-is-pending:bg-uv-surface-raised " + (result.correct ? "is-correct" : "is-wrong")} role="status">
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
