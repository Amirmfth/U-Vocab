"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send, XCircle } from "lucide-react";
import { StatusNotice } from "@/components/status-notice";
import type { ComparisonContent } from "@/lib/ai/compare-words";
import {
  evaluateComparisonProduction,
  recordComparisonChoice,
} from "../actions";

export function ComparisonTrainer({
  pairId,
  leftLabel,
  rightLabel,
  content,
}: {
  pairId: string;
  leftLabel: string;
  rightLabel: string;
  content: ComparisonContent;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<
    Record<number, { correct: boolean; explanation: string; expected: string }>
  >({});
  const [pendingChoice, startChoice] = useTransition();
  const [productionAnswers, setProductionAnswers] = useState<Record<string, string>>({});
  const [productionResults, setProductionResults] = useState<
    Record<string, { correct: boolean; feedback: string; improvedSentence?: string | null }>
  >({});
  const [pendingProduction, startProduction] = useTransition();

  return (
    <div className="compare-trainer">
      {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}
      <section className="panel compare-questions">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DISCRIMINATION</p>
            <h2>Which word fits?</h2>
          </div>
        </div>

        {content.discrimination.map((question, index) => {
          const result = answers[index];
          return (
            <article className="compare-question" key={index}>
              <p>{question.prompt}</p>

              <div className="compare-choice-grid">
                {(["LEFT", "RIGHT"] as const).map((choice) => (
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={pendingChoice || Boolean(result)}
                    key={choice}
                    onClick={() =>
                      startChoice(async () => {
                        setError(null);
                        try {
                        const response = await recordComparisonChoice({
                          pairId,
                          questionIndex: index,
                          selected: choice,
                        });
                        setAnswers((current) => ({
                          ...current,
                          [index]: response,
                        }));
                        router.refresh();
                        } catch (actionError) {
                          setError(actionError instanceof Error ? actionError.message : "Could not save this answer.");
                        }
                      })
                    }
                  >
                    {choice === "LEFT" ? leftLabel : rightLabel}
                  </button>
                ))}
              </div>

              {result ? (
                <StatusNotice tone={result.correct ? "success" : "error"}>
                  {result.correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                  {result.correct ? "Correct. " : "Expected " + result.expected + ". "}
                  {result.explanation}
                </StatusNotice>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="panel compare-production">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PRODUCTION</p>
            <h2>Use the distinction actively</h2>
          </div>
        </div>

        {([
          { target: "LEFT" as const, prompt: content.production.leftPrompt },
          { target: "RIGHT" as const, prompt: content.production.rightPrompt },
        ]).map((item) => {
          const key = item.target;
          const result = productionResults[key];

          return (
            <article className="compare-production-item" key={key}>
              <div className="word-meta">
                <span className="badge">
                  Target: {key === "LEFT" ? leftLabel : rightLabel}
                </span>
              </div>
              <p>{item.prompt}</p>
              <textarea
                rows={4}
                value={productionAnswers[key] ?? ""}
                disabled={pendingProduction}
                onChange={(event) =>
                  setProductionAnswers((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                placeholder="Schreibe einen natürlichen deutschen Satz…"
              />
              <button
                type="button"
                className="button button-primary"
                disabled={pendingProduction || !(productionAnswers[key] ?? "").trim()}
                onClick={() =>
                  startProduction(async () => {
                    setError(null);
                    try {
                    const response = await evaluateComparisonProduction({
                      pairId,
                      target: key,
                      answer: productionAnswers[key] ?? "",
                    });
                    setProductionResults((current) => ({
                      ...current,
                      [key]: response,
                    }));
                    router.refresh();
                    } catch (actionError) {
                      setError(actionError instanceof Error ? actionError.message : "Could not evaluate this sentence.");
                    }
                  })
                }
              >
                <Send size={17} />
                {pendingProduction ? "Evaluating…" : "Evaluate"}
              </button>

              {result ? (
                <StatusNotice tone={result.correct ? "success" : "error"}>
                  {result.feedback}
                  {result.improvedSentence ? (
                    <span>Suggested: {result.improvedSentence}</span>
                  ) : null}
                </StatusNotice>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
