import "server-only";

import { PushSubscriptionStatus } from "@prisma/client";
import { db } from "@/lib/db";

function validEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function registerPushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
  deviceLabel?: string | null;
}) {
  if (
    !validEndpoint(input.endpoint) ||
    input.endpoint.length > 2048 ||
    !input.p256dh ||
    input.p256dh.length > 512 ||
    !input.auth ||
    input.auth.length > 512
  ) {
    throw new Error("Invalid push subscription.");
  }

  return db.webPushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent?.slice(0, 320) ?? null,
      deviceLabel: input.deviceLabel?.slice(0, 120) ?? null,
      status: PushSubscriptionStatus.ACTIVE,
      lastSeenAt: new Date(),
    },
    update: {
      userId: input.userId,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent?.slice(0, 320) ?? null,
      deviceLabel: input.deviceLabel?.slice(0, 120) ?? null,
      status: PushSubscriptionStatus.ACTIVE,
      disabledAt: null,
      lastSeenAt: new Date(),
    },
  });
}

export async function disablePushSubscription(input: {
  userId: string;
  endpoint: string;
}) {
  if (!input.endpoint) return 0;
  const result = await db.webPushSubscription.updateMany({
    where: { userId: input.userId, endpoint: input.endpoint },
    data: {
      status: PushSubscriptionStatus.DISABLED,
      disabledAt: new Date(),
      lastSeenAt: new Date(),
    },
  });
  return result.count;
}
