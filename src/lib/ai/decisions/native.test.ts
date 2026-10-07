import assert from "node:assert/strict";
import test from "node:test";
import {
  answerMap,
  choiceAnswer,
  decisionsSafetyIdentifier,
  normalizedScore,
  predicateProbability,
  scoreAnswer,
  type DecisionAnswer,
} from "./native";

test("decision answers are mapped by stable question name and refusals are excluded", () => {
  const answers: DecisionAnswer[] = [
    { type: "choice", name: "reason", choice: "LEVEL_FIT", confidence: 0.9, probabilities: [] },
    { type: "refusal", name: "unsafe" },
    { type: "predicate", name: "correct", probability: 0.82 },
    {
      type: "score",
      name: "quality",
      score: 3,
      confidence: 0.8,
      probabilities: [
        { label: "LOW", value: 1, probability: 0.1 },
        { label: "HIGH", value: 3, probability: 0.9 },
      ],
    },
  ];
  const mapped = answerMap(answers);
  assert.equal(mapped.has("unsafe"), false);
  assert.equal(predicateProbability(mapped, "correct"), 0.82);
  assert.equal(choiceAnswer(mapped, "reason")?.choice, "LEVEL_FIT");
  assert.equal(scoreAnswer(mapped, "quality")?.score, 3);
});

test("score normalization uses probability-weighted level values", () => {
  const value = normalizedScore({
    type: "score",
    name: "quality",
    score: 3,
    confidence: 0.8,
    probabilities: [
      { label: "LOW", value: 0, probability: 0.25 },
      { label: "HIGH", value: 4, probability: 0.75 },
    ],
  });
  assert.equal(value, 0.75);
});

test("safety identifiers are stable opaque hashes", () => {
  const first = decisionsSafetyIdentifier("user-123");
  assert.equal(first, decisionsSafetyIdentifier("user-123"));
  assert.notEqual(first, decisionsSafetyIdentifier("user-456"));
  assert.equal(first.includes("user-123"), false);
  assert.ok(first.length <= 128);
});
