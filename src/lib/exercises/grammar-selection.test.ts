import assert from "node:assert/strict";
import test from "node:test";
import {
  grammarPrerequisitesReady,
  GRAMMAR_STATUS_PRIORITY,
  orderGrammarVariants,
} from "./grammar-selection";

test("needs-attention and learning concepts outrank assumed and strong grammar", () => {
  assert.ok(GRAMMAR_STATUS_PRIORITY.NEEDS_ATTENTION < GRAMMAR_STATUS_PRIORITY.LEARNING);
  assert.ok(GRAMMAR_STATUS_PRIORITY.LEARNING < GRAMMAR_STATUS_PRIORITY.ASSUMED);
  assert.ok(GRAMMAR_STATUS_PRIORITY.ASSUMED < GRAMMAR_STATUS_PRIORITY.STRONG);
});

test("recommended practice requires assumed or strong prerequisites", () => {
  const statuses = new Map([
    ["a", "ASSUMED" as const],
    ["b", "STRONG" as const],
    ["c", "LEARNING" as const],
  ]);
  assert.equal(grammarPrerequisitesReady(["a", "b"], statuses), true);
  assert.equal(grammarPrerequisitesReady(["a", "c"], statuses), false);
  assert.equal(grammarPrerequisitesReady(["a", "c"], statuses, true), true);
});

test("recognition comes before production when understanding is weak", () => {
  const variants = [
    { key:"production", type:"GRAMMAR_CLOZE" as const, dimension:"CONTROLLED_PRODUCTION" as const, mistakeType:"CASE" as const },
    { key:"recognition", type:"GRAMMAR_CHOICE" as const, dimension:"UNDERSTANDING" as const, mistakeType:"CASE" as const },
  ];
  assert.equal(orderGrammarVariants(variants, { understanding: 0.2 })[0].key, "recognition");
  assert.equal(orderGrammarVariants(variants, { understanding: 0.8 })[0].key, "production");
});
