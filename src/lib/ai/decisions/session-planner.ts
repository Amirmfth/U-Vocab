import { z } from "zod";
import type { SessionActivity } from "@prisma/client";
import { aiRoute } from "../routing";
import { getDecisionCache, putDecisionCache } from "./cache";
import { runStructuredDecision } from "./run-decision";
import {
  FIVE_LEVEL_SCORE,
  normalizedScore,
  runNativeDecision,
  scoreAnswer,
  type DecisionQuestion,
} from "./native";
import {
  decisionRolloutMode,
  shouldRunNativeDecision,
  shouldUseNativeDecision,
} from "./mode";

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

export function allocateSessionByPriority(input: {
  deterministicItems: DeterministicSessionItem[];
  requestedMinutes: number;
  dueCount: number;
  priorities: Map<SessionActivity, number>;
}) {
  const boundedMinutes = Math.max(5, Math.min(20, input.requestedMinutes));
  const available = input.deterministicItems.slice(0, DAILY_SESSION_MAX_SEGMENTS);
  if (!available.length) return [];

  const ranked = [...available].sort((a, b) => {
    const urgentA =
      a.activity === "DUE_REVIEW" && input.dueCount >= URGENT_DUE_REVIEW_THRESHOLD
        ? 1
        : 0;
    const urgentB =
      b.activity === "DUE_REVIEW" && input.dueCount >= URGENT_DUE_REVIEW_THRESHOLD
        ? 1
        : 0;
    if (urgentA !== urgentB) return urgentB - urgentA;
    return (
      (input.priorities.get(b.activity) ?? 0.5) -
      (input.priorities.get(a.activity) ?? 0.5)
    );
  });

  const selected = ranked.slice(0, Math.min(DAILY_SESSION_MAX_SEGMENTS, boundedMinutes));
  const weights = selected.map((item) => {
    const base = 0.25 + (input.priorities.get(item.activity) ?? 0.5);
    const urgency =
      item.activity === "DUE_REVIEW" && input.dueCount >= URGENT_DUE_REVIEW_THRESHOLD
        ? 0.75
        : 0;
    return base + urgency;
  });
  const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;

  let remaining = boundedMinutes;
  return selected.map((item, index) => {
    const slotsLeft = selected.length - index;
    const minutes =
      index === selected.length - 1
        ? remaining
        : Math.max(
            1,
            Math.min(
              remaining - (slotsLeft - 1),
              Math.round((boundedMinutes * weights[index]) / weightTotal),
            ),
          );
    remaining -= minutes;
    return {
      ...item,
      plannedMinutes: minutes,
      reasonCode:
        item.activity === "DUE_REVIEW" &&
        input.dueCount >= URGENT_DUE_REVIEW_THRESHOLD
          ? ("REVIEW_URGENCY" as const)
          : item.activity === "PRODUCTION"
            ? ("WEAK_PRODUCTION" as const)
            : item.activity === "GRAMMAR"
              ? ("GRAMMAR_WEAKNESS" as const)
              : item.activity === "CONTEXT"
                ? ("CONTEXT_REINFORCEMENT" as const)
                : item.activity === "NEW_WORD"
                  ? ("NEW_LEARNING" as const)
                  : ("BALANCE" as const),
    };
  });
}

function sessionPriorityQuestions(
  items: DeterministicSessionItem[],
): DecisionQuestion[] {
  return [...new Set(items.map((item) => item.activity))].map((activity) => ({
    type: "score" as const,
    name: "priority:" + activity,
    instructions:
      "How high should " + activity +
      " be prioritized in this learner's next short study session, given the supplied learner state and available activities?",
    levels: [...FIVE_LEVEL_SCORE],
  }));
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
  const legacyEnabled = process.env.AI_DAILY_SESSION_PLANNER_ENABLED === "true";
  const mode = decisionRolloutMode(
    "OPENAI_DECISIONS_SESSION_PLANNER_MODE",
    legacyEnabled,
  );
  if (!deterministic.length || (!legacyEnabled && mode === "off")) {
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
    mode: shouldUseNativeDecision(mode) ? "decisions" : "responses",
  };

  const cached = await getDecisionCache<ValidatedSessionItem[]>({
    userCourseId: input.userCourseId,
    operation: "daily_session_plan",
    model: shouldUseNativeDecision(mode) ? "gpt-6-luna" : route.model,
    dimensions,
    source: payload,
  });
  if (cached) {
    return { items: cached, usedAI: true, fallback: false, cached: true };
  }

  const nativePromise = shouldRunNativeDecision(mode)
    ? runNativeDecision({
        userId: input.userId,
        userCourseId: input.userCourseId,
        operation: "daily_session_plan",
        evidence: payload,
        questions: sessionPriorityQuestions(deterministic),
        metadata: {
          shadow: mode === "shadow",
          requestedMinutes: input.requestedMinutes,
          availableActivityCount: deterministic.length,
        },
      })
    : Promise.resolve(null);

  const legacyPromise =
    mode === "on"
      ? Promise.resolve(null)
      : runStructuredDecision({
          userId: input.userId,
          userCourseId: input.userCourseId,
          operation: "daily_session_plan",
          schema: dailySessionPlanSchema,
          schemaName: "daily_session_plan",
          system:
            "Allocate the requested session time among only the supplied available learning activities. Preserve urgent due review and keep the session varied.",
          payload,
          metadata: {
            requestedMinutes: input.requestedMinutes,
            dueCount: input.dueCount,
            availableActivityCount: deterministic.length,
          },
        });

  const [nativeResult, legacyResult] = await Promise.all([nativePromise, legacyPromise]);

  let items: ValidatedSessionItem[] | null = null;
  let model = route.model;
  let fallback = false;

  if (shouldUseNativeDecision(mode) && nativeResult?.status === "ok") {
    const priorities = new Map<SessionActivity, number>();
    for (const item of deterministic) {
      const score = normalizedScore(
        scoreAnswer(nativeResult.answers, "priority:" + item.activity),
      );
      if (score !== null) priorities.set(item.activity, score);
    }
    items = allocateSessionByPriority({
      deterministicItems: deterministic,
      requestedMinutes: input.requestedMinutes,
      dueCount: input.dueCount,
      priorities,
    });
    model = nativeResult.response.model;
  } else if (legacyResult?.status === "ok") {
    const validated = validateSessionDecision({
      decision: legacyResult.data,
      deterministicItems: deterministic,
      requestedMinutes: input.requestedMinutes,
      dueCount: input.dueCount,
    });
    if (validated.valid) items = validated.items;
    model = legacyResult.model;
    fallback = shouldUseNativeDecision(mode);
  } else if (shouldUseNativeDecision(mode)) {
    fallback = true;
  }

  if (!items?.length) {
    items = deterministic;
    fallback = true;
  }

  await putDecisionCache({
    userCourseId: input.userCourseId,
    operation: "daily_session_plan",
    model,
    dimensions,
    source: payload,
    payload: items,
    ttlSeconds: CACHE_TTL_SECONDS,
  });

  return { items, usedAI: !fallback || Boolean(legacyResult), fallback, cached: false };
}
