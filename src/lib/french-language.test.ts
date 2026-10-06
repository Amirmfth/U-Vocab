import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { lexiconAdapter } from "./lexicon/normalization";
import { frenchGrammarCurriculum, assertValidFrenchGrammarCurriculum } from "./grammar/french-curriculum";
import { grammarCurriculum } from "./grammar/curriculum";
import { targetLanguageFromCode, targetLanguageConfig } from "./languages";

test("French normalization preserves accents and normalizes apostrophes", () => {
  const adapter = lexiconAdapter("FRENCH");
  assert.equal(adapter.normalizeInput("École").normalizedLookup, "école");
  assert.equal(adapter.normalizeInput("l’école").normalizedLookup, "l'école");
  assert.deepEqual(adapter.normalizeInput("l’école").lookupVariants, ["l'école", "école"]);
  assert.equal(adapter.normalizeCanonical("L’École", "NOUN"), "école");
  assert.notEqual(adapter.normalizeCanonical("cote", "NOUN"), adapter.normalizeCanonical("côte", "NOUN"));
});

test("French lookup safely strips common article variants without stemming", () => {
  const adapter = lexiconAdapter("FRENCH");
  assert.deepEqual(adapter.normalizeInput("la maison").lookupVariants, ["la maison", "maison"]);
  assert.deepEqual(adapter.normalizeInput("les amis").lookupVariants, ["les amis", "amis"]);
  assert.deepEqual(adapter.normalizeInput("une idée").lookupVariants, ["une idée", "idée"]);
  assert.deepEqual(adapter.normalizeInput("de l’eau").lookupVariants, ["de l'eau", "eau"]);
  assert.equal(adapter.normalizeCanonical("manger", "VERB"), "manger");
  assert.notEqual(adapter.normalizeCanonical("manger", "VERB"), adapter.normalizeCanonical("mangé", "VERB"));
});

test("French target language routes to fr locale metadata", () => {
  assert.equal(targetLanguageFromCode("fr"), "FRENCH");
  assert.equal(targetLanguageConfig("FRENCH").code, "fr");
  assert.equal(targetLanguageConfig("FRENCH").locale, "fr-FR");
  assert.equal(targetLanguageConfig("FRENCH").capabilities.vocabulary, true);
  assert.equal(targetLanguageConfig("FRENCH").capabilities.grammar, true);
  assert.equal(targetLanguageConfig("FRENCH").capabilities.reading, true);
  assert.equal(targetLanguageConfig("FRENCH").capabilities.writing, true);
  assert.equal(targetLanguageConfig("FRENCH").capabilities.conversation, true);
});

test("French curriculum covers A1-C2 and cannot collide with German IDs or slugs", () => {
  assert.doesNotThrow(() => assertValidFrenchGrammarCurriculum());
  const levels = new Set(frenchGrammarCurriculum.map((item) => item.introducedAt));
  for (const level of ["A1","A2","B1","B2","C1","C2"]) assert.ok(levels.has(level as never));
  const germanIds = new Set(grammarCurriculum.map((item) => item.id));
  const germanSlugs = new Set(grammarCurriculum.map((item) => item.slug));
  for (const item of frenchGrammarCurriculum) {
    assert.ok(item.id.startsWith("fr."));
    assert.equal(germanIds.has(item.id), false);
    assert.equal(germanSlugs.has(item.slug), false);
  }
});

test("French schema migration preserves German data while generalizing target-language fields", () => {
  const sql = fs.readFileSync("prisma/migrations/20261006121000_french_target_language/migration.sql", "utf8");
  assert.match(sql, /RENAME COLUMN "german" TO "targetText"/);
  assert.match(sql, /RENAME COLUMN "germanDefinition" TO "targetDefinition"/);
  assert.doesNotMatch(sql, /DELETE FROM/);
  assert.doesNotMatch(sql, /DROP TABLE/);
});

test("major AI learning surfaces receive targetLanguage instead of German-only routing", () => {
  for (const path of [
    "src/lib/ai/analyze-word.ts",
    "src/lib/ai/reading-generation.ts",
    "src/lib/ai/reading-analyzer.ts",
    "src/lib/ai/writing-task.ts",
    "src/lib/ai/writing-evaluator.ts",
    "src/lib/ai/conversation-setup.ts",
    "src/lib/ai/conversation-turn-evaluator.ts",
    "src/lib/ai/conversation-final-evaluator.ts",
  ]) {
    const source = fs.readFileSync(path, "utf8");
    assert.match(source, /targetLanguage/);
    assert.match(source, /targetLanguageConfig/);
  }
});

test("course management keeps active course separate from UI locale", () => {
  const actions = fs.readFileSync("src/app/settings/course-actions.ts", "utf8");
  assert.match(actions, /activeCourseId/);
  assert.match(actions, /multi_course/);
  assert.doesNotMatch(actions, /uiLocale/);
  assert.match(actions, /userId_targetLanguage/);
});
