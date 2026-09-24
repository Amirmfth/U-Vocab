import assert from "node:assert/strict";
import test from "node:test";
import { scoreRecommendation } from "./recommendations";

test("graph, context, and semantic signals raise recommendation score", () => {
  const weak = scoreRecommendation({
    similarity: 0,
    graphNeighbor: false,
    topicOverlap: false,
    recentEncounter: false,
    levelMatch: false,
    weakAnchor: false,
    usefulness: 0,
  });

  const strong = scoreRecommendation({
    similarity: 0.86,
    graphNeighbor: true,
    topicOverlap: true,
    recentEncounter: true,
    levelMatch: true,
    weakAnchor: true,
    usefulness: 5,
  });

  assert.ok(strong.score > weak.score);
  assert.ok(strong.reasons.length >= 5);
  assert.ok(strong.score <= 1);
});

test("high usefulness adds a ranking reason", () => {
  const ranked = scoreRecommendation({
    similarity: 0,
    graphNeighbor: false,
    topicOverlap: false,
    recentEncounter: false,
    levelMatch: false,
    weakAnchor: false,
    usefulness: 5,
  });

  assert.ok(ranked.reasons.some((reason) => reason.label.includes("usefulness")));
});
