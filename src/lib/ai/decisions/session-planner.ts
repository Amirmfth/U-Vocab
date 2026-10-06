import { z } from "zod";
import type { SessionActivity } from "@prisma/client";
import { aiRoute } from "../routing";
import { getDecisionCache, putDecisionCache } from "./cache";
import { runStructuredDecision } from "./run-decision";

export const DAILY_SESSION_MAX_SEGMENTS = 5;
export const URGENT_DUE_REVIEW_THRESHOLD = 5;
const CACHE_TTL_SECONDS = 12 * 60 * 60;

const sessionActivitySchema = z.enum([
  "WARMUP",
  "DUE_REVIEW",
  "NEW_WORD",
  "CONTEXT",
  "PRODUCTION",
  "FINAL_CHALLENGE",
  "GRAMMAR",
]);

const sessionReasonSchema = z.enum([
  "REVIEW_URGENCY",
  "WEAK_PRODUCTION",
  "GRAMMAR_WEAKNESS",
  "CONTEXT_REINFORCEMENT",
  "NEW_LEARNING",
  "BALANCE",
]);

export const dailySessionPlanSchema = z.object({
  segments: z.array(
    z.object({
      activity: sessionActivitySchema,
      minutes: z.number().int().min(1).max(12),
      reasonCode: sessionReasonSchema,
    }),
  ).min(1).max(DAILY_SESSION_MAX_SEGMENTS),
});

export type DailySessionPlanDecision = z.infer<typeof dailySessionPlanSchema>;

export type DeterministicSessionItem = {
  activity: SessionActivity;
  lexemeId?: string | null;
  title: string;
  description?: string | null;
  href: string;
  plannedMinutes: number;
};

export type ValidatedSessionItem = DeterministicSessionItem & {
  reasonCode?: z.infer<typeof sessionReasonSchema>;
};

export function normalizeDeterministicPlan(
  items: DeterministicSessionItem[],
  requestedMinutes: number,
) {
  const boundedMinutes = Math.max(5, Math.min(20, requestedMinutes));
  const selected = items.slice(0, DAILY_SESSION_MAX_SEGMENTS);
  if (!selected.length) return [];

  const base = Math.max(1, Math.floor(boundedMinutes / selected.length));
  let remaining = boundedMinutes;
  return selected.map((item, index) => {
    const slotsLeft = selected.length - index;
    const minutes =
      index === selected.length - 1
        ? remaining
        : Math.max(1, Math.min(item.plannedMinutes, remaining - (slotsLeft - 1)));
    remaining -= minutes;
    return { ...item, plannedMinutes: minutes || base };
  });
}

export function validateSessionDecision(input: {
  decision: DailySessionPlanDecision;
  deterministicItems: DeterministicSessionItem[];
  requestedMinutes: number;
  dueCount: number;
}) {
  const available = new Map<SessionActivity, DeterministicSessionItem>();
  for (const item of input.deterministicItems) {
    if (!available.has(item.activity)) available.set(item.activity, item);
  }

  const merged = new Map<SessionActivity, { minutes: number; reasonCode: z.infer<typeof sessionReasonSchema> }>();
  for (const segment of input.decision.segments) {
    if (!available.has(segment.activity as SessionActivity)) {
      return { valid: false as const, reason: "UNAVAILABLE_ACTIVITY" };
    }
    const current = merged.get(segment.activity as SessionActivity);
    merged.set(segment.activity as SessionActivity, {
      minutes: (current?.minutes ?? 0) + segment.minutes,
      reasonCode: current?.reasonCode ?? segment.reasonCode,
    });
  }

  if (merged.size > DAILY_SESSION_MAX_SEGMENTS) {
    return { valid: false as const, reason: "TOO_MANY_SEGMENTS" };
  }
  const totalMinutes = [...merged.values()].reduce((sum, item) => sum + item.minutes, 0);
  if (totalMinutes > input.requestedMinutes || totalMinutes < Math.max(3, input.requestedMinutes - 3)) {
    return { valid: false as const, reason: "INVALID_TOTAL_MINUTES" };
  }
  if (
    input.dueCount >= URGENT_DUE_REVIEW_THRESHOLD &&
    available.has("DUE_REVIEW") &&
    !merged.has("DUE_REVIEW")
  ) {
    return { valid: false as const, reason: "URGENT_REVIEW_OMITTED" };
  }

  const items: ValidatedSessionItem[] = [];
  for (const item of input.deterministicItems) {
    const segment = merged.get(item.activity);
    if (!segment || items.some((existing) => existing.activity === item.activity)) continue;
    items.push({
      ...item,
      plannedMinutes: segment.minutes,
      reasonCode: segment.reasonCode,
    });
  }
  return { valid: true as const, items };
}

export async function planDailySession(input: {
  userId: string;
  userCourseId: string;
  requestedMinutes: number;
  dueCount: number;
  weakProductionCount: number;
  unresolvedMistakeCount: number;
  currentLevel: string;
  targetLevel: string;
  deterministicItems: DeterministicSessionItem[];
  localDateKey: string;
}) {
  const deterministic = normalizeDeterministicPlan(
    input.deterministicItems,
    input.requestedMinutes,
  );
  if (
    !deterministic.length ||
    process.env.AI_DAILY_SESSION_PLANNER_ENABLED !== "true"
  ) {
    return { items: deterministic, usedAI: false, fallback: false };
  }

  const route = aiRoute("daily_session_plan");
  const payload = {
    learner: {
      currentLevel: input.currentLevel,
      targetLevel: input.targetLevel,
      dueCount: Math.min(input.dueCount, 50),
      weakProductionCount: Math.min(input.weakProductionCount, 50),
      unresolvedMistakeCount: Math.min(input.unresolvedMistakeCount, 50),
    },
    requestedMinutes: input.requestedMinutes,
    availableActivities: deterministic.map((item) => item.activity),
  };
  const dimensions = {
    localDateKey: input.localDateKey,
    requestedMinutes: input.requestedMinutes,
    availableActivities: deterministic.map((item) => item.activity),
  };

  const cached = await getDecisionCache<DailySessionPlanDecision>({
    userCourseId: input.userCourseId,
    operation: "daily_session_plan",
    model: route.model,
    dimensions,
    source: payload,
  });
  if (cached) {
    const validated = validateSessionDecision({
      decision: cached,
      deterministicItems: deterministic,
      requestedMinutes: input.requestedMinutes,
      dueCount: input.dueCount,
    });
    if (validated.valid) {
      return { items: validated.items, usedAI: true, fallback: false, cached: true };
    }
  }

  const result = await runStructuredDecision({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "daily_session_plan",
    schema: dailySessionPlanSchema,
    schemaName: "daily_session_plan",
    system:
      "Allocate the requested session time among only the supplied available learning activities. Preserve urgent due review, prioritize weak production and recurring mistakes, and keep the session varied. Do not select individual cards, words, or grammar concepts.",
    payload,
    metadata: {
      requestedMinutes: input.requestedMinutes,
      dueCount: input.dueCount,
      availableActivityCount: deterministic.length,
    },
  });
  if (result.status !== "ok") {
    return { items: deterministic, usedAI: false, fallback: true };
  }

  const validated = validateSessionDecision({
    decision: result.data,
    deterministicItems: deterministic,
    requestedMinutes: input.requestedMinutes,
    dueCount: input.dueCount,
  });
  if (!validated.valid) {
    return {
      items: deterministic,
      usedAI: false,
      fallback: true,
      validationFailure: validated.reason,
    };
  }

  await putDecisionCache({
    userCourseId: input.userCourseId,
    operation: "daily_session_plan",
    model: result.model,
    dimensions,
    source: payload,
    payload: result.data,
    ttlSeconds: CACHE_TTL_SECONDS,
  });

  return { items: validated.items, usedAI: true, fallback: false, cached: false };
}
