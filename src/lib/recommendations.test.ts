import assert from "node:assert/strict";
import test from "node:test";
import { scoreRecommendation } from "./recommendations";

test("graph, context, and semantic signals raise recommendation score", () => {
  const weak = scoreRecommendation({
    similarity: 0,
    graphNeighbor: false,
    recentEncounter: false,
    levelMatch: false,
    weakAnchor: false,
  });

  const strong = scoreRecommendation({
    similarity: 0.86,
    graphNeighbor: true,
    recentEncounter: true,
    levelMatch: true,
    weakAnchor: true,
  });

  assert.ok(strong.score > weak.score);
  assert.ok(strong.reasons.length >= 4);
  assert.ok(strong.score <= 1);
});
