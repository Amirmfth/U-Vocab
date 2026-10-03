import "server-only";

import webpush from "web-push";
import { PushSubscriptionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWebPushConfig } from "./config";
import type { ReviewReminderPayload } from "./payload";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const config = requireWebPushConfig();
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  configured = true;
}

export type PushSendResult =
  | { ok: true; statusCode: number | null }
  | { ok: false; permanent: boolean; statusCode: number | null; category: string };

export async function sendWebPush(
  subscription: {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: ReviewReminderPayload,
): Promise<PushSendResult> {
  ensureConfigured();

  try {
    const response = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
      {
        TTL: 60 * 60 * 6,
        urgency: "normal",
        topic: "review-reminder",
      },
    );
    return { ok: true, statusCode: response.statusCode ?? null };
  } catch (error) {
    const candidate = error as {
      statusCode?: number;
      name?: string;
      message?: string;
    };
    const statusCode = candidate.statusCode ?? null;
    const permanent = statusCode === 404 || statusCode === 410;

    if (permanent) {
      await db.webPushSubscription.update({
        where: { id: subscription.id },
        data: {
          status: PushSubscriptionStatus.INVALID,
          disabledAt: new Date(),
        },
      });
    }

    return {
      ok: false,
      permanent,
      statusCode,
      category: permanent
        ? "subscription_invalid"
        : statusCode && statusCode >= 400 && statusCode < 500
          ? "provider_rejected"
          : "provider_transient",
    };
  }
}
