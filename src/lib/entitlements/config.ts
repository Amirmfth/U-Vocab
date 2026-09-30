import type { Plan } from "@prisma/client";

export type EntitlementFeature =
  | "advanced_analytics"
  | "long_history"
  | "multi_course"
  | "voice_transcription"
  | "listening_realtime";

export type QuotaKey =
  | "vocabulary_addition_daily"
  | "conversation_turn_monthly"
  | "writing_evaluation_monthly"
  | "reading_generation_monthly"
  | "voice_transcription_minutes_monthly";

export type QuotaPeriod = "DAY" | "MONTH";

export type QuotaDefinition = {
  limit: number;
  period: QuotaPeriod;
  labelKey:
    | "plan.quota.vocabulary"
    | "plan.quota.conversation"
    | "plan.quota.writing"
    | "plan.quota.reading"
    | "plan.quota.voice";
};

export type PlanEntitlements = {
  features: Record<EntitlementFeature, boolean>;
  quotas: Record<QuotaKey, QuotaDefinition>;
};

export const PLAN_ENTITLEMENTS: Record<Plan, PlanEntitlements> = {
  FREE: {
    features: {
      advanced_analytics: false,
      long_history: false,
      multi_course: false,
      voice_transcription: false,
      listening_realtime: false,
    },
    quotas: {
      vocabulary_addition_daily: {
        limit: 5,
        period: "DAY",
        labelKey: "plan.quota.vocabulary",
      },
      conversation_turn_monthly: {
        limit: 40,
        period: "MONTH",
        labelKey: "plan.quota.conversation",
      },
      writing_evaluation_monthly: {
        limit: 5,
        period: "MONTH",
        labelKey: "plan.quota.writing",
      },
      reading_generation_monthly: {
        limit: 5,
        period: "MONTH",
        labelKey: "plan.quota.reading",
      },
      voice_transcription_minutes_monthly: {
        limit: 0,
        period: "MONTH",
        labelKey: "plan.quota.voice",
      },
    },
  },
  PRO: {
    features: {
      advanced_analytics: true,
      long_history: true,
      multi_course: true,
      voice_transcription: true,
      listening_realtime: true,
    },
    quotas: {
      vocabulary_addition_daily: {
        limit: 250,
        period: "DAY",
        labelKey: "plan.quota.vocabulary",
      },
      conversation_turn_monthly: {
        limit: 3000,
        period: "MONTH",
        labelKey: "plan.quota.conversation",
      },
      writing_evaluation_monthly: {
        limit: 300,
        period: "MONTH",
        labelKey: "plan.quota.writing",
      },
      reading_generation_monthly: {
        limit: 300,
        period: "MONTH",
        labelKey: "plan.quota.reading",
      },
      voice_transcription_minutes_monthly: {
        limit: 1200,
        period: "MONTH",
        labelKey: "plan.quota.voice",
      },
    },
  },
};

export const PLAN_COMPARISON = [
  {
    plan: "FREE" as const,
    titleKey: "plan.free",
    descriptionKey: "plan.freeDescription",
  },
  {
    plan: "PRO" as const,
    titleKey: "plan.pro",
    descriptionKey: "plan.proDescription",
  },
] as const;

export const PROVIDER_SPEND_SAFETY = {
  maxExpensiveActionsPerUserPerHour: Math.max(
    1,
    Number(process.env.MAX_EXPENSIVE_ACTIONS_PER_USER_HOUR ?? "60") || 60,
  ),
  maxProviderCostUsdPerUserPerDay: Math.max(
    0.25,
    Number(process.env.MAX_PROVIDER_COST_USD_PER_USER_DAY ?? "10") || 10,
  ),
};
