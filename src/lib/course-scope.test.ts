import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cacheTags } from "./cache-tags";
import { courseOwnershipWhere } from "./current-course";
import { TARGET_LANGUAGE_CONFIG } from "./languages";
import { queryKeys } from "./query-keys";

test("course-scoped query keys and cache tags do not collide", () => {
  const de = "course-de";
  const fr = "course-fr";

  assert.notDeepEqual(queryKeys.vocabulary.list(de), queryKeys.vocabulary.list(fr));
  assert.notDeepEqual(queryKeys.review.queue(de), queryKeys.review.queue(fr));
  assert.notDeepEqual(queryKeys.word.detail(de, "lexeme-1"), queryKeys.word.detail(fr, "lexeme-1"));
  assert.notDeepEqual(queryKeys.word.conjugation(de, "lexeme-1"), queryKeys.word.conjugation(fr, "lexeme-1"));
  assert.notDeepEqual(queryKeys.mistakes.open(de), queryKeys.mistakes.open(fr));
  assert.notDeepEqual(queryKeys.recommendations.list(de), queryKeys.recommendations.list(fr));
  assert.notDeepEqual(queryKeys.writing.session(de, "session-1"), queryKeys.writing.session(fr, "session-1"));
  assert.notDeepEqual(queryKeys.conversation.session(de, "session-1"), queryKeys.conversation.session(fr, "session-1"));
  assert.notDeepEqual(queryKeys.usage.filtered(de, "30d", {}), queryKeys.usage.filtered(fr, "30d", {}));

  assert.notEqual(cacheTags.home(de), cacheTags.home(fr));
  assert.notEqual(cacheTags.vocabulary(de), cacheTags.vocabulary(fr));
  assert.notEqual(cacheTags.review(de), cacheTags.review(fr));
  assert.notEqual(cacheTags.word(de, "lexeme-1"), cacheTags.word(fr, "lexeme-1"));
});

test("course ownership predicate always includes both course and user identity", () => {
  assert.deepEqual(courseOwnershipWhere("user-1", "course-1"), {
    id: "course-1",
    userId: "user-1",
  });
});

test("German remains the enabled complete course capability", () => {
  assert.equal(TARGET_LANGUAGE_CONFIG.GERMAN.enabled, true);
  assert.deepEqual(TARGET_LANGUAGE_CONFIG.GERMAN.capabilities, {
    vocabulary: true,
    grammar: true,
    reading: true,
    writing: true,
    conversation: true,
  });
  assert.equal(TARGET_LANGUAGE_CONFIG.FRENCH.enabled, false);
  assert.equal(TARGET_LANGUAGE_CONFIG.ENGLISH.enabled, false);
});

test("schema allows the same learner content in different courses without collision", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const vocabulary = schema.match(/model UserVocabulary \{[\s\S]*?\n\}/)?.[0] ?? "";
  const grammar = schema.match(/model UserGrammarProgress \{[\s\S]*?\n\}/)?.[0] ?? "";
  const user = schema.match(/model User \{[\s\S]*?\n\}/)?.[0] ?? "";
  const course = schema.match(/model UserCourse \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(course, /currentLevel\s+CefrLevel/);
  assert.match(course, /targetLevel\s+CefrLevel/);
  assert.match(course, /explanationLanguage\s+TranslationLanguage/);
  assert.match(course, /@@unique\(\[userId, targetLanguage\]\)/);

  assert.match(vocabulary, /@@unique\(\[userCourseId, lexemeId\]\)/);
  assert.match(grammar, /@@unique\(\[userCourseId, grammarConceptId\]\)/);

  assert.doesNotMatch(user, /\bcurrentLevel\b/);
  assert.doesNotMatch(user, /\btargetLevel\b/);
  assert.doesNotMatch(user, /\bpreferredTranslation\b/);
});

test("German migration backfills learner settings and preserves course-owned history", () => {
  const migration = readFileSync(
    "prisma/migrations/20260929150000_user_course/migration.sql",
    "utf8",
  );

  assert.match(migration, /'GERMAN'::"TargetLanguage"/);
  assert.match(migration, /"currentLevel"/);
  assert.match(migration, /"targetLevel"/);
  assert.match(migration, /"preferredTranslation"/);
  assert.match(migration, /SET "activeCourseId" = course\."id"/);

  for (const table of [
    "UserVocabulary",
    "Attempt",
    "Mistake",
    "Encounter",
    "GrammarEvidence",
    "ConversationSession",
    "WritingSession",
    "ReadingDocument",
    "Story",
  ]) {
    assert.match(migration, new RegExp("'" + table + "'"));
  }

  assert.match(migration, /ALTER TABLE "AIUsageEvent" ADD COLUMN "userCourseId"/);
  assert.match(migration, /DROP COLUMN "currentLevel"/);
  assert.match(migration, /DROP COLUMN "targetLevel"/);
  assert.match(migration, /DROP COLUMN "preferredTranslation"/);
});
