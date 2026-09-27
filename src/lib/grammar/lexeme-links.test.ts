import assert from "node:assert/strict";
import test from "node:test";
import {
  inferDeterministicGrammarLinks,
  invalidGrammarConceptIds,
} from "./lexeme-links";

test("dative verb pattern maps to canonical dative and prepositional grammar", () => {
  const links = inferDeterministicGrammarLinks({
    id: "x",
    lemma: "teilnehmen",
    partOfSpeech: "VERB",
    article: null,
    patterns: [{ id: "p", pattern: "teilnehmen an + Dat.", explanation: null }],
  });
  const ids = new Set(links.map((item) => item.grammarConceptId));
  assert.ok(ids.has("de.case.dative"));
  assert.ok(ids.has("de.preposition.prepositional-verbs"));
});

test("subordinating conjunction maps to verb-final structure", () => {
  const links = inferDeterministicGrammarLinks({
    id: "x",
    lemma: "obwohl",
    partOfSpeech: "CONJUNCTION",
    article: null,
    patterns: [],
  });
  assert.ok(links.some((item) => item.grammarConceptId === "de.conjunction.subordinate-verb-final"));
  assert.ok(links.some((item) => item.grammarConceptId === "de.conjunction.concession"));
});

test("ordinary nouns are not assigned unrelated case concepts", () => {
  const links = inferDeterministicGrammarLinks({
    id: "x",
    lemma: "Tisch",
    partOfSpeech: "NOUN",
    article: "der",
    patterns: [],
  });
  assert.deepEqual(
    links.map((item) => item.grammarConceptId),
    ["de.article.definite"],
  );
});


test("unknown AI grammar concept IDs are rejected by the canonical allowlist", () => {
  const invalid = invalidGrammarConceptIds(
    [
      { grammarConceptId: "de.case.dative", confidence: 0.95 },
      { grammarConceptId: "de.fake.invented", confidence: 0.99 },
    ],
    new Set(["de.case.dative"]),
  );
  assert.deepEqual(invalid, ["de.fake.invented"]);
});
