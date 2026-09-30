import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { lexiconAdapter } from "./normalization";
import {
  canonicalLexemeKey,
  classifyLexemeIds,
  safeCanonicalFill,
} from "./canonical";

test("German article, casing, Unicode, and whitespace variants normalize for lookup", () => {
  const adapter = lexiconAdapter("GERMAN");

  const withArticle = adapter.normalizeInput("  die   Gelegenheit  ");
  const canonicalCase = adapter.normalizeInput("Gelegenheit");
  const lowercase = adapter.normalizeInput("gelegenheit");

  assert.equal(withArticle.normalizedLookup, "die gelegenheit");
  assert.deepEqual(withArticle.lookupVariants, ["die gelegenheit", "gelegenheit"]);
  assert.equal(canonicalCase.normalizedLookup, "gelegenheit");
  assert.equal(lowercase.normalizedLookup, "gelegenheit");
  assert.equal(adapter.normalizeCanonical("Gelegenheit", "NOUN"), "gelegenheit");
  assert.equal(adapter.normalizeCanonical("die Gelegenheit", "NOUN"), "gelegenheit");
});

test("normalization handles safe punctuation variants without heuristic stemming", () => {
  const adapter = lexiconAdapter("GERMAN");

  assert.equal(adapter.normalizeInput("„E-Mail“").normalizedLookup, "e-mail");
  assert.equal(adapter.normalizeInput("E–Mail").normalizedLookup, "e-mail");
  assert.notEqual(
    adapter.normalizeCanonical("gehen", "VERB"),
    adapter.normalizeCanonical("ging", "VERB"),
  );
});

test("part of speech remains part of canonical identity", () => {
  const adapter = lexiconAdapter("GERMAN");
  const nounKey = canonicalLexemeKey(adapter, "Band", "NOUN");
  const verbKey = canonicalLexemeKey(adapter, "Band", "VERB");

  assert.notEqual(nounKey, verbKey);
  assert.equal(nounKey, "de:band:NOUN");
  assert.equal(verbKey, "de:band:VERB");
});

test("equivalent concurrent requests produce the same database identity key", () => {
  const adapter = lexiconAdapter("GERMAN");
  const a = canonicalLexemeKey(adapter, "die Gelegenheit", "NOUN");
  const b = canonicalLexemeKey(adapter, "Gelegenheit", "NOUN");
  const c = canonicalLexemeKey(adapter, "gelegenheit", "NOUN");

  assert.equal(a, b);
  assert.equal(b, c);
});

test("alias collisions are classified as ambiguous rather than guessed", () => {
  assert.deepEqual(classifyLexemeIds([]), { kind: "miss", id: null });
  assert.deepEqual(classifyLexemeIds(["lexeme-1", "lexeme-1"]), {
    kind: "unique",
    id: "lexeme-1",
  });
  assert.deepEqual(classifyLexemeIds(["lexeme-1", "lexeme-2"]), {
    kind: "ambiguous",
    id: null,
  });
});

test("later candidates only fill missing canonical data and never overwrite populated values", () => {
  assert.deepEqual(
    safeCanonicalFill(
      { article: "die", plural: "Gelegenheiten", cefrLevel: "B1" },
      { article: "das", plural: "Gelegenheit", cefrLevel: "A1" },
    ),
    {},
  );

  assert.deepEqual(
    safeCanonicalFill(
      { article: null, plural: null, cefrLevel: null },
      { article: "die", plural: "Gelegenheiten", cefrLevel: "B1" },
    ),
    { article: "die", plural: "Gelegenheiten", cefrLevel: "B1" },
  );
});

test("lexicon migration is additive and preserves learner/review tables while backfilling senses", () => {
  const sql = fs.readFileSync(
    "prisma/migrations/20260930110000_lexicon_hardening/migration.sql",
    "utf8",
  );

  assert.match(sql, /CREATE TABLE "LexemeSense"/);
  assert.match(sql, /CREATE TABLE "LexemeAlias"/);
  assert.match(sql, /CREATE TABLE "LexemeProvenance"/);
  assert.match(sql, /UPDATE "Translation" AS t\s+SET "senseId"/);
  assert.doesNotMatch(sql, /DROP TABLE "UserVocabulary"/);
  assert.doesNotMatch(sql, /DROP TABLE "Review"/);
  assert.doesNotMatch(sql, /UPDATE "UserVocabulary"/);
  assert.doesNotMatch(sql, /DELETE FROM "Review"/);
});
