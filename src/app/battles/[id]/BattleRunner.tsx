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
      <section className="panel battle-finished uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-4.5 uv-vd552c26874:m-0 uv-vd552c26874:text-uv-fd69b9c5786 uv-vd552c26874:uv-line-height-8e007eaa50 uv-vd552c26874:uv-letter-spacing-b22247dbaf rounded-uv-r6d27d54c6c">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">BATTLE COMPLETE</p>
        <h2>{score} points</h2>
        <p className="muted text-uv-text-muted">
          {Math.min(answered, questions.length)} / {questions.length} answered
        </p>
        <button
          type="button"
          className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
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
      <div className="battle-hud grid uv-grid-template-columns-e4c3efd568 items-center gap-2.5 min-h-10.5 uv-padding-a03728e684 text-uv-text-muted text-uv-f823f1262bd uv-veda02a0adb:text-uv-text uv-veda02a0adb:uv-font-family-320794573f uv-veda02a0adb:text-uv-f19feeb881c uv-v87e7c148d8:uv-justify-self-7a92f3d263">
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
          className="panel battle-question-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-4.5 uv-vd552c26874:m-0 uv-vd552c26874:text-uv-fd69b9c5786 uv-vd552c26874:uv-line-height-8e007eaa50 uv-vd552c26874:uv-letter-spacing-b22247dbaf rounded-uv-r6d27d54c6c"
          initial={reduceMotion ? false : { opacity: 0, x: 30, scale: 0.99 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -36, scale: 0.985 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        >
          <h2>{current.prompt}</h2>

          <div className="battle-options grid uv-grid-template-columns-6a5c4d4d49 gap-2.5 uv-min620:uv-grid-template-columns-dd0b1a1848">
            {current.options.map((option) => {
              const isCorrect = Boolean(result) && option === result?.expected;
              const isWrong = Boolean(result) && selected === option && !result?.correct;
              return (
                <button
                  type="button"
                  className={[
                    "battle-option uv-font-3e26d67509 min-h-14.5 w-full flex items-center justify-between gap-3 uv-padding-b0f44c163d uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface text-uv-text text-left cursor-pointer uv-transition-792ccfb84f uv-v999cdc25ee:border-uv-border-strong uv-v999cdc25ee:bg-uv-surface-raised uv-v999cdc25ee:uv-transform-4693dc4baa uv-v8b31ac2bd7:border-uv-border-strong uv-v8b31ac2bd7:bg-uv-surface-raised uv-v8b31ac2bd7:uv-transform-4693dc4baa disabled:cursor-default uv-v48f8f87023:border-uv-border-strong uv-v48f8f87023:bg-uv-surface-raised uv-vc1297541ff:border-uv-success uv-vc1297541ff:bg-uv-cafddaf6a65 uv-vfbdf4ae9ba:border-uv-danger uv-vfbdf4ae9ba:bg-uv-c8b3083dabe uv-vefd2d335a6:text-uv-success uv-vd980f564fa:text-uv-danger",
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

          {saveError ? <div className="battle-feedback is-wrong flex items-start gap-2.25 p-3 rounded-uv-r0939007802 uv-vc1297541ff:bg-uv-cb0392f6948 uv-vc1297541ff:text-uv-success uv-vfbdf4ae9ba:bg-uv-c8ae00eb793 uv-vfbdf4ae9ba:text-uv-danger uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:uv-line-height-a26f83404b uv-vc5ce1d313b:text-uv-text-muted uv-vc5ce1d313b:bg-uv-surface-raised" role="status">{saveError}</div> : null}

          {result ? (
            <div className={"battle-feedback flex items-start gap-2.25 p-3 rounded-uv-r0939007802 uv-vc1297541ff:bg-uv-cb0392f6948 uv-vc1297541ff:text-uv-success uv-vfbdf4ae9ba:bg-uv-c8ae00eb793 uv-vfbdf4ae9ba:text-uv-danger uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:uv-line-height-a26f83404b uv-vc5ce1d313b:text-uv-text-muted uv-vc5ce1d313b:bg-uv-surface-raised " + (result.correct ? "is-correct" : "is-wrong")} role="status">
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
