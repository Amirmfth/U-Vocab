import { Prisma, type Plan } from "@prisma/client";
import { db } from "@/lib/db";
import {
  PLAN_ENTITLEMENTS,
  type EntitlementFeature,
  type QuotaKey,
} from "./config";
import { ProRequiredError, QuotaExceededError } from "./errors";
import { quotaPeriodFor } from "./periods";
import { quotaAllows, resolveEffectivePlanRecords } from "./policy";

export type EffectivePlan = {
  plan: Plan;
  source: "subscription" | "grant" | "free";
  validUntil: Date | null;
  cancelAtPeriodEnd: boolean;
};

export async function getEffectivePlan(
  userId: string,
  now = new Date(),
): Promise<EffectivePlan> {
  const [subscriptions, grants] = await Promise.all([
    db.subscription.findMany({
      where: { userId, plan: "PRO" },
      select: {
        plan: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
      orderBy: { currentPeriodEnd: "desc" },
      take: 6,
    }),
    db.entitlementGrant.findMany({
      where: { userId, plan: "PRO" },
      select: {
        plan: true,
        startsAt: true,
        endsAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return resolveEffectivePlanRecords({ now, subscriptions, grants });
}

export async function getEntitlements(userId: string, now = new Date()) {
  const effective = await getEffectivePlan(userId, now);
  return {
    ...effective,
    config: PLAN_ENTITLEMENTS[effective.plan],
  };
}

export async function requireEntitlement(
  userId: string,
  feature: EntitlementFeature,
) {
  const entitlements = await getEntitlements(userId);
  if (!entitlements.config.features[feature]) {
    throw new ProRequiredError(feature);
  }
  return entitlements;
}

export async function checkQuota(input: {
  userId: string;
  userCourseId?: string | null;
  timeZone: string;
  key: QuotaKey;
  amount?: number;
  now?: Date;
}) {
  const amount = Math.max(1, Math.trunc(input.amount ?? 1));
  const now = input.now ?? new Date();
  const entitlements = await getEntitlements(input.userId, now);
  const definition = entitlements.config.quotas[input.key];
  const period = quotaPeriodFor(now, input.timeZone, definition.period);

  const aggregate = await db.quotaUsageEvent.aggregate({
    where: {
      userId: input.userId,
      operationKey: input.key,
      periodStart: period.start,
      periodEnd: period.end,
      ...(input.userCourseId ? { userCourseId: input.userCourseId } : {}),
    },
    _sum: { amount: true },
  });

  const used = aggregate._sum.amount ?? 0;
  return {
    plan: entitlements.plan,
    source: entitlements.source,
    key: input.key,
    limit: definition.limit,
    used,
    remaining: Math.max(0, definition.limit - used),
    allowed: quotaAllows(used, amount, definition.limit),
    resetAt: period.end,
    periodKey: period.periodKey,
  };
}

function isRetryableSerializableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function consumeQuota(input: {
  userId: string;
  userCourseId?: string | null;
  timeZone: string;
  key: QuotaKey;
  sourceRef: string;
  amount?: number;
  metadata?: Prisma.InputJsonValue;
  now?: Date;
}) {
  const amount = Math.max(1, Math.trunc(input.amount ?? 1));
  const now = input.now ?? new Date();
  const entitlements = await getEntitlements(input.userId, now);
  const definition = entitlements.config.quotas[input.key];
  const period = quotaPeriodFor(now, input.timeZone, definition.period);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const existing = await tx.quotaUsageEvent.findUnique({
            where: {
              userId_operationKey_sourceRef: {
                userId: input.userId,
                operationKey: input.key,
                sourceRef: input.sourceRef,
              },
            },
          });

          if (existing) {
            const aggregate = await tx.quotaUsageEvent.aggregate({
              where: {
                userId: input.userId,
                operationKey: input.key,
                periodStart: period.start,
                periodEnd: period.end,
                ...(input.userCourseId
                  ? { userCourseId: input.userCourseId }
                  : {}),
              },
              _sum: { amount: true },
            });
            const used = aggregate._sum.amount ?? 0;
            return {
              consumed: false,
              idempotent: true,
              plan: entitlements.plan,
              limit: definition.limit,
              used,
              remaining: Math.max(0, definition.limit - used),
              resetAt: period.end,
            };
          }

          const aggregate = await tx.quotaUsageEvent.aggregate({
            where: {
              userId: input.userId,
              operationKey: input.key,
              periodStart: period.start,
              periodEnd: period.end,
              ...(input.userCourseId ? { userCourseId: input.userCourseId } : {}),
            },
            _sum: { amount: true },
          });

          const used = aggregate._sum.amount ?? 0;
          if (!quotaAllows(used, amount, definition.limit)) {
            throw new QuotaExceededError(input.key, definition.limit, used, period.end);
          }

          await tx.quotaUsageEvent.create({
            data: {
              userId: input.userId,
              userCourseId: input.userCourseId ?? null,
              operationKey: input.key,
              amount,
              periodKey: period.periodKey,
              periodStart: period.start,
              periodEnd: period.end,
              sourceRef: input.sourceRef,
              metadata: input.metadata,
            },
          });

          return {
            consumed: true,
            idempotent: false,
            plan: entitlements.plan,
            limit: definition.limit,
            used: used + amount,
            remaining: Math.max(0, definition.limit - used - amount),
            resetAt: period.end,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5_000,
          timeout: 10_000,
        },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableSerializableError(error)) continue;
      throw error;
    }
  }

  throw new Error("Quota transaction failed.");
}

export async function getQuotaSummary(input: {
  userId: string;
  userCourseId?: string | null;
  timeZone: string;
  now?: Date;
}) {
  const keys = Object.keys(
    (await getEntitlements(input.userId, input.now)).config.quotas,
  ) as QuotaKey[];

  return Promise.all(
    keys.map((key) =>
      checkQuota({
        userId: input.userId,
        userCourseId: input.userCourseId,
        timeZone: input.timeZone,
        key,
        now: input.now,
      }),
    ),
  );
}
