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
      <section className="panel battle-finished [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:18px] [&_h2]:[margin:0] [&_h2]:[font-size:clamp(1.3rem,_6vw,_2rem)] [&_h2]:[line-height:1.25] [&_h2]:[letter-spacing:-0.035em] [border-radius:18px]">
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">BATTLE COMPLETE</p>
        <h2>{score} points</h2>
        <p className="muted [color:var(--text-muted)]">
          {Math.min(answered, questions.length)} / {questions.length} answered
        </p>
        <button
          type="button"
          className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
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
    <section className="battle-runner [display:flex] [flex-direction:column] [gap:14px]">
      <div className="battle-hud [display:grid] [grid-template-columns:1fr_auto_1fr] [align-items:center] [gap:10px] [min-height:42px] [padding:0_2px] [color:var(--text-muted)] [font-size:0.75rem] [&_strong]:[color:var(--text)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_strong]:[font-size:1rem] [&_>_:last-child]:[justify-self:end]">
        <span>{index + 1}/{questions.length}</span>
        <strong>{score} pts</strong>
        {mode === "TIMED" ? (
          <span className="battle-timer [display:inline-flex] [align-items:center] [gap:5px]"><Clock3 size={15} /> {remaining}s</span>
        ) : (
          <span>untimed</span>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          key={current.id}
          className="panel battle-question-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:18px] [&_h2]:[margin:0] [&_h2]:[font-size:clamp(1.3rem,_6vw,_2rem)] [&_h2]:[line-height:1.25] [&_h2]:[letter-spacing:-0.035em] [border-radius:18px]"
          initial={reduceMotion ? false : { opacity: 0, x: 30, scale: 0.99 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -36, scale: 0.985 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        >
          <h2>{current.prompt}</h2>

          <div className="battle-options [display:grid] [grid-template-columns:1fr] [gap:10px] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
            {current.options.map((option) => {
              const isCorrect = Boolean(result) && option === result?.expected;
              const isWrong = Boolean(result) && selected === option && !result?.correct;
              return (
                <button
                  type="button"
                  className={[
                    "battle-option [font:inherit] [min-height:58px] [width:100%] [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding:13px_15px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface)] [color:var(--text)] [text-align:left] [cursor:pointer] [transition:transform_140ms_ease,_border-color_140ms_ease,_background_140ms_ease,_opacity_140ms_ease] [&:hover:not(:disabled)]:[border-color:var(--border-strong)] [&:hover:not(:disabled)]:[background:var(--surface-raised)] [&:hover:not(:disabled)]:[transform:translateY(-1px)] [&:focus-visible:not(:disabled)]:[border-color:var(--border-strong)] [&:focus-visible:not(:disabled)]:[background:var(--surface-raised)] [&:focus-visible:not(:disabled)]:[transform:translateY(-1px)] [&:disabled]:[cursor:default] [&.is-selected]:[border-color:var(--border-strong)] [&.is-selected]:[background:var(--surface-raised)] [&.is-correct]:[border-color:var(--success)] [&.is-correct]:[background:var(--success-soft)] [&.is-wrong]:[border-color:var(--danger)] [&.is-wrong]:[background:var(--danger-soft)] [&.is-correct_>_svg]:[color:var(--success)] [&.is-wrong_>_svg]:[color:var(--danger)]",
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

          {saveError ? <div className="battle-feedback is-wrong [display:flex] [align-items:flex-start] [gap:9px] [padding:12px] [border-radius:12px] [&.is-correct]:[background:rgba(73,_201,_139,_0.08)] [&.is-correct]:[color:var(--success)] [&.is-wrong]:[background:rgba(255,_107,_122,_0.07)] [&.is-wrong]:[color:var(--danger)] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:3px] [&_span]:[color:var(--text-muted)] [&_span]:[line-height:1.4] [&.is-pending]:[color:var(--text-muted)] [&.is-pending]:[background:var(--surface-raised)]" role="status">{saveError}</div> : null}

          {result ? (
            <div className={"battle-feedback [display:flex] [align-items:flex-start] [gap:9px] [padding:12px] [border-radius:12px] [&.is-correct]:[background:rgba(73,_201,_139,_0.08)] [&.is-correct]:[color:var(--success)] [&.is-wrong]:[background:rgba(255,_107,_122,_0.07)] [&.is-wrong]:[color:var(--danger)] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:3px] [&_span]:[color:var(--text-muted)] [&_span]:[line-height:1.4] [&.is-pending]:[color:var(--text-muted)] [&.is-pending]:[background:var(--surface-raised)] " + (result.correct ? "is-correct" : "is-wrong")} role="status">
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
