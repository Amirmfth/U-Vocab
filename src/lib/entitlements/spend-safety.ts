import { db } from "@/lib/db";
import { PROVIDER_SPEND_SAFETY } from "./config";
import { EntitlementError } from "./errors";
import { quotaPeriodFor } from "./periods";

export async function assertProviderSpendSafety(input: {
  userId: string;
  timeZone: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const userDay = quotaPeriodFor(now, input.timeZone, "DAY");
  const globalStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const globalEnd = new Date(globalStart.getTime() + 24 * 60 * 60 * 1000);

  const [recentActions, userCost, globalCost] = await Promise.all([
    db.aiUsageEvent.count({
      where: {
        userId: input.userId,
        status: "SUCCESS",
        createdAt: { gte: hourAgo },
      },
    }),
    db.aiUsageEvent.aggregate({
      where: {
        userId: input.userId,
        status: "SUCCESS",
        createdAt: { gte: userDay.start, lt: userDay.end },
      },
      _sum: { totalCost: true },
    }),
    db.aiUsageEvent.aggregate({
      where: {
        status: "SUCCESS",
        createdAt: { gte: globalStart, lt: globalEnd },
      },
      _sum: { totalCost: true },
    }),
  ]);

  const userSpend = Number(userCost._sum.totalCost ?? 0);
  const globalSpend = Number(globalCost._sum.totalCost ?? 0);

  if (
    recentActions >= PROVIDER_SPEND_SAFETY.maxExpensiveActionsPerUserPerHour ||
    userSpend >= PROVIDER_SPEND_SAFETY.maxProviderCostUsdPerUserPerDay ||
    globalSpend >= PROVIDER_SPEND_SAFETY.maxProviderCostUsdGlobalPerDay
  ) {
    throw new EntitlementError(
      "USAGE_SAFETY_LIMIT",
      "This action is temporarily unavailable.",
    );
  }
}
