import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { lexiconAdapter } from "./lexicon/normalization";
import { preferredLexicalMeaning } from "./lexical-meaning";
import { targetLanguageConfig, targetLanguageFromCode } from "./languages";
import { englishGrammarCurriculum, assertValidEnglishGrammarCurriculum } from "./grammar/english-curriculum";
import { frenchGrammarCurriculum } from "./grammar/french-curriculum";
import { grammarCurriculum } from "./grammar/curriculum";
import { buildReviewCard } from "./review-card";

test("English normalization preserves contractions, apostrophes, possessives and phrasal units", () => {
  const adapter = lexiconAdapter("ENGLISH");
  assert.equal(adapter.normalizeInput("DON’T").normalizedLookup, "don't");
  assert.equal(adapter.normalizeInput("teacher’s").normalizedLookup, "teacher's");
  assert.deepEqual(adapter.normalizeInput("teacher’s").lookupVariants, ["teacher's", "teacher"]);
  assert.deepEqual(adapter.normalizeInput("it’s").lookupVariants, ["it's"]);
  assert.equal(adapter.normalizeCanonical("look after", "PHRASE"), "look after");
  assert.equal(adapter.normalizeCanonical("carry on", "VERB"), "carry on");
});

test("English target metadata exposes complete capabilities behind the release flag", () => {
  assert.equal(targetLanguageFromCode("en"), "ENGLISH");
  const config = targetLanguageConfig("ENGLISH");
  assert.equal(config.code, "en");
  assert.equal(config.locale, "en-US");
  assert.deepEqual(config.capabilities, {
    vocabulary: true,
    grammar: true,
    reading: true,
    writing: true,
    conversation: true,
  });
});

test("target-English meaning semantics prefer definitions for English explanations and Persian for translation", () => {
  const lexeme = {
    language: "en",
    translations: [
      { language: "en", text: "fake same-language translation" },
      { language: "fa", text: "تصمیم گرفتن" },
    ],
    definitions: [
      { language: "en", text: "to make a choice after considering options" },
    ],
  };

  assert.deepEqual(preferredLexicalMeaning(lexeme, "ENGLISH"), {
    text: "to make a choice after considering options",
    language: "en",
    kind: "definition",
  });
  assert.deepEqual(preferredLexicalMeaning(lexeme, "PERSIAN"), {
    text: "تصمیم گرفتن",
    language: "fa",
    kind: "translation",
  });
});

test("English review cards use monolingual definitions without pretending they are translations", () => {
  const card = buildReviewCard({
    lexeme: {
      language: "en",
      lemma: "decide",
      article: null,
      partOfSpeech: "VERB",
      translations: [{ language: "fa", text: "تصمیم گرفتن" }],
      definitions: [{ language: "en", text: "to make a choice" }],
      patterns: [{ pattern: "decide to do something", explanation: null }],
      examples: [{ targetText: "We decided to leave early." }],
    },
    preference: "ENGLISH",
    snapshot: {
      recognition: 0.9,
      meaningRecall: 0.9,
      production: 0.4,
      contextualUsage: 0.5,
      mistakeTypes: [],
    },
    recentTypes: [],
  });

  assert.equal(card.family, "MEANING_TARGET");
  assert.equal(card.front.prompt, "to make a choice");
  assert.equal(card.front.language, "en");
  assert.equal(card.back.language, "en");
});

test("English grammar curriculum covers A1-C2 with isolated IDs and slugs", () => {
  assert.doesNotThrow(() => assertValidEnglishGrammarCurriculum());
  const levels = new Set(englishGrammarCurriculum.map((item) => item.introducedAt));
  for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
    assert.ok(levels.has(level as never));
  }

  const otherIds = new Set([
    ...grammarCurriculum.map((item) => item.id),
    ...frenchGrammarCurriculum.map((item) => item.id),
  ]);
  const otherSlugs = new Set([
    ...grammarCurriculum.map((item) => item.slug),
    ...frenchGrammarCurriculum.map((item) => item.slug),
  ]);
  for (const item of englishGrammarCurriculum) {
    assert.ok(item.id.startsWith("en."));
    assert.equal(otherIds.has(item.id), false);
    assert.equal(otherSlugs.has(item.slug), false);
  }
});

test("English semantic migration is additive and preserves existing German/French translation data", () => {
  const sql = fs.readFileSync(
    "prisma/migrations/20261006143000_english_lexeme_definitions/migration.sql",
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "LexemeDefinition"/);
  assert.match(sql, /"senseId"/);
  assert.match(sql, /targetText/);
  assert.doesNotMatch(sql, /DELETE FROM "Translation"/);
  assert.doesNotMatch(sql, /DROP TABLE "Translation"/);
  assert.doesNotMatch(sql, /DROP TABLE "Lexeme"/);
});

test("English course switching remains independent from UI locale", () => {
  const courseActions = fs.readFileSync("src/app/settings/course-actions.ts", "utf8");
  assert.match(courseActions, /activeCourseId/);
  assert.match(courseActions, /targetLanguage/);
  assert.doesNotMatch(courseActions, /uiLocale/);

  const settingsActions = fs.readFileSync("src/app/settings/actions.ts", "utf8");
  const uiLocaleBlock = settingsActions.slice(
    settingsActions.indexOf("export async function updateUiLocale"),
    settingsActions.indexOf("export async function updateTranslationPreference"),
  );
  assert.match(uiLocaleBlock, /uiLocale/);
  assert.doesNotMatch(uiLocaleBlock, /activeCourseId|targetLanguage/);
});

test("English core AI surfaces remain target-language routed", () => {
  for (const path of [
    "src/lib/ai/analyze-word.ts",
    "src/lib/ai/reading-generation.ts",
    "src/lib/ai/reading-analyzer.ts",
    "src/lib/ai/writing-task.ts",
    "src/lib/ai/writing-evaluator.ts",
    "src/lib/ai/conversation-setup.ts",
    "src/lib/ai/conversation-turn-evaluator.ts",
    "src/lib/ai/conversation-final-evaluator.ts",
    "src/lib/ai/grammar-quick-teach.ts",
    "src/lib/ai/grammar-lesson.ts",
  ]) {
    const source = fs.readFileSync(path, "utf8");
    assert.match(source, /targetLanguage|targetLanguageConfig|target\.promptName/);
  }
});
