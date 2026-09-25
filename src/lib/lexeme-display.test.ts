import assert from "node:assert/strict";
import test from "node:test";
import { formatLexemeLabel } from "./lexeme-display";

test("formatLexemeLabel omits missing article values", () => {
  assert.equal(formatLexemeLabel({ article: null, lemma: "lernen" }), "lernen");
  assert.equal(formatLexemeLabel({ article: "null", lemma: "lernen" }), "lernen");
});

test("formatLexemeLabel does not duplicate an article already in the lemma", () => {
  assert.equal(formatLexemeLabel({ article: "die", lemma: "die Grenze" }), "die Grenze");
  assert.equal(formatLexemeLabel({ article: "der", lemma: "Grenze" }), "der Grenze");
});
