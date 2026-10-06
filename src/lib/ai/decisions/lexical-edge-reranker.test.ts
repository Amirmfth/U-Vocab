import assert from "node:assert/strict";
import test from "node:test";
import { reconcileLexicalEdges, LEXICAL_EDGE_SELECTION_LIMIT } from "./lexical-edge-reranker";

test("lexical edge reranking can only select supplied relation IDs", () => {
  const relations = [{ id: "r1" }, { id: "r2" }, { id: "r3" }];
  const selected = reconcileLexicalEdges(relations, {
    selected: [
      { relationId: "invented", priority: 1, purpose: "CONTRAST" },
      { relationId: "r2", priority: 0.9, purpose: "ACTIVE_PRODUCTION" },
      { relationId: "r2", priority: 0.4, purpose: "WORD_FAMILY" },
    ],
  });
  assert.deepEqual(selected.map((item) => item.id), ["r2", "r1", "r3"]);
  assert.equal(selected[0].aiPurpose, "ACTIVE_PRODUCTION");
});

test("personalized relation subset remains small", () => {
  assert.ok(LEXICAL_EDGE_SELECTION_LIMIT >= 3);
  assert.ok(LEXICAL_EDGE_SELECTION_LIMIT <= 5);
});
