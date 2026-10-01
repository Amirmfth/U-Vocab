import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { summarizeUsage } from "@/lib/ai/usage-analytics";

function source(path: string) {
  return fs.readFileSync(path, "utf8");
}

test("ADMIN is a first-class persisted role with audit storage", () => {
  const schema = source("prisma/schema.prisma");
  assert.match(schema, /enum UserRole\s*\{[\s\S]*USER[\s\S]*ADMIN[\s\S]*\}/);
  assert.match(schema, /role\s+UserRole\s+@default\(USER\)/);
  assert.match(schema, /model AdminAuditLog/);
  assert.match(schema, /adminUserId\s+String/);
  assert.match(schema, /action\s+String/);
  assert.match(schema, /targetType\s+String/);
  assert.match(schema, /targetId\s+String/);
});

test("all admin pages and actions have server authorization boundaries", () => {
  for (const path of [
    "src/app/admin/layout.tsx",
    "src/app/admin/page.tsx",
    "src/app/admin/users/page.tsx",
    "src/app/admin/users/[id]/page.tsx",
    "src/app/admin/usage/page.tsx",
    "src/app/admin/lexicon/page.tsx",
    "src/app/admin/subscriptions/page.tsx",
    "src/app/admin/system/page.tsx",
    "src/app/admin/actions.ts",
    "src/app/usage/page.tsx",
  ]) {
    assert.match(source(path), /requireAdmin/);
  }
  const guard = source("src/lib/admin/auth.ts");
  assert.match(guard, /user\.role !== UserRole\.ADMIN/);
});

test("admin actions cannot rely on client-side privilege checks", () => {
  const actions = source("src/app/admin/actions.ts");
  assert.match(actions, /^"use server";/);
  const checks = actions.match(/await requireAdmin\(\)/g) ?? [];
  assert.ok(checks.length >= 7);
});

test("entitlement mutations write audit rows in the same transaction", () => {
  const users = source("src/lib/admin/users.ts");
  assert.match(users, /db\.\$transaction/);
  assert.match(users, /action: "entitlement\.granted"/);
  assert.match(users, /action: "entitlement\.revoked"/);
  assert.match(users, /adminAuditLog\.create/);
});

test("lexicon mutations are audited and merge repoints dependent relation families", () => {
  const lexicon = source("src/lib/admin/lexicon.ts");
  assert.match(lexicon, /action: "lexeme\.edited"/);
  assert.match(lexicon, /action: "lexeme\.merge_initiated"/);
  assert.match(lexicon, /action: "lexeme\.merge_completed"/);
  for (const dependency of [
    "userVocabulary",
    "review",
    "attempt",
    "LexemeAlias",
    "lexemeSense",
    "translation",
    "lexemeProvenance",
    "lexicalPattern",
    "example",
    "mistake",
    "Encounter",
    "LexemeGrammarConcept",
    "TopicPackItem",
    "StoryTarget",
    "ReadingItem",
    "RecommendationFeedback",
    "ConversationTarget",
    "WritingTarget",
    "LexemeInsight",
    "learningSessionItem",
    "battleQuestion",
    "lexemeRelation",
    "confusionPair",
  ]) {
    assert.ok(lexicon.includes(dependency), "missing merge handling for " + dependency);
  }
  const sourceDelete = lexicon.indexOf("await tx.lexeme.delete");
  const repoint = lexicon.indexOf("await mergeUserVocabulary");
  assert.ok(repoint >= 0 && sourceDelete > repoint, "source lexeme must be deleted after dependent repointing");
});

test("large admin datasets are paginated and globally useful AI filters are indexed", () => {
  const users = source("src/app/admin/users/page.tsx");
  const usage = source("src/app/admin/usage/page.tsx");
  const lexicon = source("src/app/admin/lexicon/page.tsx");
  assert.match(users, /PAGE_SIZE = 25/);
  assert.match(users, /skip: \(page - 1\) \* PAGE_SIZE/);
  assert.match(usage, /PAGE_SIZE = 40/);
  assert.match(usage, /skip: \(page - 1\) \* PAGE_SIZE/);
  assert.match(lexicon, /PAGE_SIZE = 12/);
  const schema = source("prisma/schema.prisma");
  for (const index of [
    "@@index([operation, createdAt])",
    "@@index([model, createdAt])",
    "@@index([status, createdAt])",
  ]) {
    assert.ok(schema.includes(index));
  }
});

test("AI usage summary arithmetic matches the underlying events", () => {
  const rows = [
    { operation: "a", model: "m", status: "SUCCESS" as const, inputTokens: 100, cachedInputTokens: 20, outputTokens: 50, totalTokens: 150, totalCost: 0.01, durationMs: 100 },
    { operation: "a", model: "m", status: "ERROR" as const, inputTokens: 40, cachedInputTokens: 0, outputTokens: 0, totalTokens: 40, totalCost: 0.002, durationMs: 300 },
    { operation: "b", model: "m2", status: "SUCCESS" as const, inputTokens: 10, cachedInputTokens: 0, outputTokens: 5, totalTokens: 15, totalCost: null, durationMs: null },
  ];
  const summary = summarizeUsage(rows);
  assert.equal(summary.requests, 3);
  assert.equal(summary.failures, 1);
  assert.equal(summary.totalTokens, 205);
  assert.equal(summary.unpricedRequests, 1);
  assert.equal(summary.totalCost, 0.012);
  assert.equal(summary.averageCost, 0.006);
  assert.equal(summary.averageLatencyMs, 200);
});

test("learner settings no longer exposes developer AI telemetry", () => {
  const settings = source("src/app/settings/page.tsx");
  assert.equal(settings.includes('href="/usage"'), false);
  const legacy = source("src/app/usage/page.tsx");
  assert.match(legacy, /requireAdmin/);
  assert.match(legacy, /redirect\("\/admin\/usage"\)/);
});

test("admin user detail does not query raw writing conversation or reading content", () => {
  const detail = source("src/app/admin/users/[id]/page.tsx");
  assert.equal(detail.includes("conversationMessages"), false);
  assert.equal(detail.includes("writingSessions"), false);
  assert.equal(detail.includes("readingDocuments"), false);
  assert.equal(detail.includes("content: true"), false);
  assert.equal(detail.includes("draft: true"), false);
});
