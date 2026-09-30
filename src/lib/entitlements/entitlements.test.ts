import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { PLAN_ENTITLEMENTS } from "./config";
import { quotaPeriodFor } from "./periods";
import { quotaAllows, resolveEffectivePlanRecords } from "./policy";

const now = new Date("2026-09-30T12:00:00.000Z");

test("Free vocabulary allowance defaults to five genuine additions per learner day", () => {
  assert.equal(
    PLAN_ENTITLEMENTS.FREE.quotas.vocabulary_addition_daily.limit,
    5,
  );
  assert.equal(
    PLAN_ENTITLEMENTS.FREE.quotas.vocabulary_addition_daily.period,
    "DAY",
  );
  assert.ok(
    PLAN_ENTITLEMENTS.PRO.quotas.vocabulary_addition_daily.limit >
      PLAN_ENTITLEMENTS.FREE.quotas.vocabulary_addition_daily.limit,
  );
});

test("active paid subscription takes precedence over manual grant", () => {
  const decision = resolveEffectivePlanRecords({
    now,
    subscriptions: [
      {
        plan: "PRO",
        status: "ACTIVE",
        currentPeriodStart: new Date("2026-09-01T00:00:00Z"),
        currentPeriodEnd: new Date("2026-10-01T00:00:00Z"),
        cancelAtPeriodEnd: true,
      },
    ],
    grants: [
      {
        plan: "PRO",
        startsAt: new Date("2026-09-01T00:00:00Z"),
        endsAt: new Date("2026-12-01T00:00:00Z"),
        revokedAt: null,
      },
    ],
  });

  assert.equal(decision.plan, "PRO");
  assert.equal(decision.source, "subscription");
  assert.equal(decision.cancelAtPeriodEnd, true);
});

test("grace subscription remains Pro while canceled or expired records do not", () => {
  const grace = resolveEffectivePlanRecords({
    now,
    subscriptions: [
      {
        plan: "PRO",
        status: "GRACE",
        currentPeriodStart: new Date("2026-09-01T00:00:00Z"),
        currentPeriodEnd: new Date("2026-10-01T00:00:00Z"),
        cancelAtPeriodEnd: false,
      },
    ],
    grants: [],
  });
  assert.equal(grace.plan, "PRO");

  const inactive = resolveEffectivePlanRecords({
    now,
    subscriptions: [
      {
        plan: "PRO",
        status: "CANCELED",
        currentPeriodStart: new Date("2026-09-01T00:00:00Z"),
        currentPeriodEnd: new Date("2026-10-01T00:00:00Z"),
        cancelAtPeriodEnd: false,
      },
      {
        plan: "PRO",
        status: "EXPIRED",
        currentPeriodStart: new Date("2026-08-01T00:00:00Z"),
        currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
        cancelAtPeriodEnd: false,
      },
    ],
    grants: [],
  });
  assert.equal(inactive.plan, "FREE");
});

test("valid manual override grants Pro when there is no active paid subscription", () => {
  const decision = resolveEffectivePlanRecords({
    now,
    subscriptions: [],
    grants: [
      {
        plan: "PRO",
        startsAt: new Date("2026-09-29T00:00:00Z"),
        endsAt: new Date("2026-10-02T00:00:00Z"),
        revokedAt: null,
      },
    ],
  });
  assert.equal(decision.plan, "PRO");
  assert.equal(decision.source, "grant");
});

test("revoked or expired manual grants fall back to Free", () => {
  const decision = resolveEffectivePlanRecords({
    now,
    subscriptions: [],
    grants: [
      {
        plan: "PRO",
        startsAt: new Date("2026-09-01T00:00:00Z"),
        endsAt: new Date("2026-09-20T00:00:00Z"),
        revokedAt: null,
      },
      {
        plan: "PRO",
        startsAt: new Date("2026-09-01T00:00:00Z"),
        endsAt: null,
        revokedAt: new Date("2026-09-29T00:00:00Z"),
      },
    ],
  });
  assert.equal(decision.plan, "FREE");
});

test("quota boundary permits under/at limit and rejects over limit", () => {
  assert.equal(quotaAllows(3, 1, 5), true);
  assert.equal(quotaAllows(4, 1, 5), true);
  assert.equal(quotaAllows(5, 1, 5), false);
  assert.equal(quotaAllows(4, 2, 5), false);
});

test("daily periods reset at learner-local midnight", () => {
  const period = quotaPeriodFor(
    new Date("2026-09-30T20:31:00.000Z"),
    "Asia/Tehran",
    "DAY",
  );
  assert.equal(period.periodKey, "2026-10-01");
  assert.equal(period.start.toISOString(), "2026-09-30T20:30:00.000Z");
  assert.equal(period.end.toISOString(), "2026-10-01T20:30:00.000Z");
});

test("monthly periods follow learner-local calendar month", () => {
  const period = quotaPeriodFor(
    new Date("2026-09-30T20:31:00.000Z"),
    "Asia/Tehran",
    "MONTH",
  );
  assert.equal(period.periodKey, "2026-10");
  assert.equal(period.start.toISOString(), "2026-09-30T20:30:00.000Z");
  assert.equal(period.end.toISOString(), "2026-10-31T20:30:00.000Z");
});

test("quota ledger enforces idempotency and service uses serializable transactions", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  const service = fs.readFileSync(
    "src/lib/entitlements/service.ts",
    "utf8",
  );

  assert.match(
    schema,
    /@@unique\(\[userId, operationKey, sourceRef\]\)/,
  );
  assert.match(
    service,
    /TransactionIsolationLevel\.Serializable/,
  );
  assert.match(service, /P2034/);
});

test("expensive product boundaries enforce quota server-side", () => {
  const vocabulary = fs.readFileSync(
    "src/app/vocabulary/new/actions.ts",
    "utf8",
  );
  const reading = fs.readFileSync("src/app/reading/actions.ts", "utf8");
  const writing = fs.readFileSync("src/app/writing/actions.ts", "utf8");
  const conversation = fs.readFileSync(
    "src/app/api/conversation/[id]/message/route.ts",
    "utf8",
  );

  assert.match(vocabulary, /vocabulary_addition_daily/);
  assert.match(reading, /reading_generation_monthly/);
  assert.match(writing, /writing_evaluation_monthly/);
  assert.match(conversation, /conversation_turn_monthly/);
  assert.match(conversation, /status: 429/);
});

test("already-owned vocabulary is checked before quota consumption", () => {
  const vocabulary = fs.readFileSync(
    "src/app/vocabulary/new/actions.ts",
    "utf8",
  );
  const ownedIndex = vocabulary.indexOf("const owned =");
  const consumeIndex = vocabulary.indexOf('key: "vocabulary_addition_daily"', ownedIndex);
  assert.ok(ownedIndex >= 0);
  assert.ok(consumeIndex > ownedIndex);
  assert.match(vocabulary.slice(ownedIndex, consumeIndex + 200), /if \(!owned\)/);
});
