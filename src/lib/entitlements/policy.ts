import type { Plan, SubscriptionStatus } from "@prisma/client";

export type SubscriptionCandidate = {
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
};

export type GrantCandidate = {
  plan: Plan;
  startsAt: Date;
  endsAt: Date | null;
  revokedAt: Date | null;
};

export type EffectivePlanDecision = {
  plan: Plan;
  source: "subscription" | "grant" | "free";
  validUntil: Date | null;
  cancelAtPeriodEnd: boolean;
};

export function resolveEffectivePlanRecords(input: {
  now: Date;
  subscriptions: SubscriptionCandidate[];
  grants: GrantCandidate[];
}): EffectivePlanDecision {
  const subscription = input.subscriptions
    .filter(
      (item) =>
        item.plan === "PRO" &&
        (item.status === "ACTIVE" || item.status === "GRACE") &&
        item.currentPeriodStart <= input.now &&
        item.currentPeriodEnd > input.now,
    )
    .sort(
      (a, b) =>
        b.currentPeriodEnd.getTime() - a.currentPeriodEnd.getTime(),
    )[0];

  if (subscription) {
    return {
      plan: "PRO",
      source: "subscription",
      validUntil: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  const grant = input.grants
    .filter(
      (item) =>
        item.plan === "PRO" &&
        !item.revokedAt &&
        item.startsAt <= input.now &&
        (!item.endsAt || item.endsAt > input.now),
    )
    .sort(
      (a, b) =>
        (b.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (a.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER),
    )[0];

  if (grant) {
    return {
      plan: "PRO",
      source: "grant",
      validUntil: grant.endsAt,
      cancelAtPeriodEnd: false,
    };
  }

  return {
    plan: "FREE",
    source: "free",
    validUntil: null,
    cancelAtPeriodEnd: false,
  };
}

export function quotaAllows(used: number, amount: number, limit: number) {
  return used + amount <= limit;
}
