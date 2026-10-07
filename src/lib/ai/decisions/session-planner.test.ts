import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateSessionByPriority,
  normalizeDeterministicPlan,
  validateSessionDecision,
} from "./session-planner";

const items = [
  { activity: "DUE_REVIEW" as const, title: "Review", href: "/review", plannedMinutes: 6 },
  { activity: "PRODUCTION" as const, title: "Production", href: "/practice", plannedMinutes: 4 },
  { activity: "GRAMMAR" as const, title: "Grammar", href: "/grammar", plannedMinutes: 3 },
  { activity: "FINAL_CHALLENGE" as const, title: "Challenge", href: "/practice", plannedMinutes: 2 },
];

test("session decision enforces requested total and available activities", () => {
  const valid = validateSessionDecision({
    decision: {
      segments: [
        { activity: "DUE_REVIEW", minutes: 6, reasonCode: "REVIEW_URGENCY" },
        { activity: "PRODUCTION", minutes: 4, reasonCode: "WEAK_PRODUCTION" },
        { activity: "GRAMMAR", minutes: 3, reasonCode: "GRAMMAR_WEAKNESS" },
        { activity: "FINAL_CHALLENGE", minutes: 2, reasonCode: "BALANCE" },
      ],
    },
    deterministicItems: items,
    requestedMinutes: 15,
    dueCount: 8,
  });
  assert.equal(valid.valid, true);

  const unavailable = validateSessionDecision({
    decision: { segments: [{ activity: "NEW_WORD", minutes: 15, reasonCode: "NEW_LEARNING" }] },
    deterministicItems: items,
    requestedMinutes: 15,
    dueCount: 0,
  });
  assert.deepEqual(unavailable, { valid: false, reason: "UNAVAILABLE_ACTIVITY" });
});

test("urgent due review cannot be omitted", () => {
  const result = validateSessionDecision({
    decision: {
      segments: [
        { activity: "PRODUCTION", minutes: 8, reasonCode: "WEAK_PRODUCTION" },
        { activity: "GRAMMAR", minutes: 7, reasonCode: "GRAMMAR_WEAKNESS" },
      ],
    },
    deterministicItems: items,
    requestedMinutes: 15,
    dueCount: 10,
  });
  assert.deepEqual(result, { valid: false, reason: "URGENT_REVIEW_OMITTED" });
});

test("deterministic fallback never exceeds the requested duration", () => {
  const result = normalizeDeterministicPlan(items, 10);
  assert.ok(result.length <= 5);
  assert.equal(result.reduce((sum, item) => sum + item.plannedMinutes, 0), 10);
});


test("native Decisions priorities are converted to minutes deterministically", () => {
  const priorities = new Map([
    ["DUE_REVIEW" as const, 0.95],
    ["PRODUCTION" as const, 0.8],
    ["GRAMMAR" as const, 0.55],
    ["FINAL_CHALLENGE" as const, 0.25],
  ]);
  const first = allocateSessionByPriority({
    deterministicItems: items,
    requestedMinutes: 15,
    dueCount: 10,
    priorities,
  });
  const second = allocateSessionByPriority({
    deterministicItems: items,
    requestedMinutes: 15,
    dueCount: 10,
    priorities,
  });
  assert.deepEqual(first, second);
  assert.equal(first.reduce((sum, item) => sum + item.plannedMinutes, 0), 15);
  assert.equal(first[0].activity, "DUE_REVIEW");
});
