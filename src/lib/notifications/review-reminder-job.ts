import "server-only";

import {
  NotificationDeliveryStatus,
  NotificationType,
  PushSubscriptionStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { sendProductEventForUser } from "@/lib/analytics/server";
import { reviewReminderPayload } from "./payload";
import { withinReminderWindow } from "./time";
import { sendWebPush } from "./web-push";

const MAX_PREFERENCES_PER_RUN = 500;
const MAX_ATTEMPTS = 3;
const STALE_PROCESSING_MS = 10 * 60 * 1000;

export type ReviewReminderJobSummary = {
  preferencesChecked: number;
  eligibleUsers: number;
  deliveriesClaimed: number;
  sent: number;
  transientFailures: number;
  permanentFailures: number;
  skipped: number;
};

async function claimDelivery(input: {
  userId: string;
  userCourseId: string;
  subscriptionId: string;
  bucketKey: string;
  dueCount: number;
  now: Date;
}) {
  const delivery = await db.notificationDelivery.upsert({
    where: {
      subscriptionId_type_bucketKey: {
        subscriptionId: input.subscriptionId,
        type: NotificationType.REVIEW_REMINDER,
        bucketKey: input.bucketKey,
      },
    },
    create: {
      userId: input.userId,
      userCourseId: input.userCourseId,
      subscriptionId: input.subscriptionId,
      type: NotificationType.REVIEW_REMINDER,
      bucketKey: input.bucketKey,
      dueCount: input.dueCount,
      status: NotificationDeliveryStatus.PENDING,
    },
    update: {
      dueCount: input.dueCount,
    },
    select: {
      id: true,
      status: true,
      attemptCount: true,
      attemptedAt: true,
    },
  });

  const staleBefore = new Date(input.now.getTime() - STALE_PROCESSING_MS);
  const claimed = await db.notificationDelivery.updateMany({
    where: {
      id: delivery.id,
      attemptCount: { lt: MAX_ATTEMPTS },
      OR: [
        { status: NotificationDeliveryStatus.PENDING },
        { status: NotificationDeliveryStatus.FAILED_TRANSIENT },
        {
          status: NotificationDeliveryStatus.PROCESSING,
          attemptedAt: { lt: staleBefore },
        },
      ],
    },
    data: {
      status: NotificationDeliveryStatus.PROCESSING,
      attemptedAt: input.now,
      attemptCount: { increment: 1 },
      dueCount: input.dueCount,
      errorCategory: null,
    },
  });

  return claimed.count === 1 ? delivery.id : null;
}

export async function runReviewReminderJob(
  now = new Date(),
): Promise<ReviewReminderJobSummary> {
  const summary: ReviewReminderJobSummary = {
    preferencesChecked: 0,
    eligibleUsers: 0,
    deliveriesClaimed: 0,
    sent: 0,
    transientFailures: 0,
    permanentFailures: 0,
    skipped: 0,
  };

  const preferences = await db.reviewNotificationPreference.findMany({
    where: {
      enabled: true,
      course: { status: "ACTIVE" },
      user: {
        pushSubscriptions: {
          some: { status: PushSubscriptionStatus.ACTIVE },
        },
      },
    },
    select: {
      userId: true,
      userCourseId: true,
      reminderMinuteOfDay: true,
      minimumDueCount: true,
      user: {
        select: {
          activeCourseId: true,
          timezone: true,
          uiLocale: true,
          pushSubscriptions: {
            where: { status: PushSubscriptionStatus.ACTIVE },
            select: {
              id: true,
              endpoint: true,
              p256dh: true,
              auth: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "asc" },
    take: MAX_PREFERENCES_PER_RUN,
  });

  summary.preferencesChecked = preferences.length;

  for (const preference of preferences) {
    if (preference.user.activeCourseId !== preference.userCourseId) {
      summary.skipped += 1;
      continue;
    }

    const schedule = withinReminderWindow({
      now,
      timeZone: preference.user.timezone || "UTC",
      reminderMinuteOfDay: preference.reminderMinuteOfDay,
      windowMinutes: 20,
    });
    if (!schedule.eligible) continue;

    const dueCount = await db.userVocabulary.count({
      where: {
        userCourseId: preference.userCourseId,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
      },
    });
    if (dueCount < preference.minimumDueCount) {
      summary.skipped += 1;
      continue;
    }

    summary.eligibleUsers += 1;
    const payload = reviewReminderPayload({
      locale: preference.user.uiLocale,
      dueCount,
    });

    for (const subscription of preference.user.pushSubscriptions) {
      const deliveryId = await claimDelivery({
        userId: preference.userId,
        userCourseId: preference.userCourseId,
        subscriptionId: subscription.id,
        bucketKey: schedule.bucketKey,
        dueCount,
        now,
      });
      if (!deliveryId) continue;

      summary.deliveriesClaimed += 1;
      const result = await sendWebPush(subscription, payload);

      if (result.ok) {
        await db.notificationDelivery.update({
          where: { id: deliveryId },
          data: {
            status: NotificationDeliveryStatus.SENT,
            sentAt: new Date(),
            providerStatus: result.statusCode,
          },
        });
        summary.sent += 1;
        await sendProductEventForUser(preference.userId, "review_notification_sent", {
          dueCount,
        });
        continue;
      }

      await db.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: result.permanent
            ? NotificationDeliveryStatus.FAILED_PERMANENT
            : NotificationDeliveryStatus.FAILED_TRANSIENT,
          providerStatus: result.statusCode,
          errorCategory: result.category,
        },
      });
      if (result.permanent) summary.permanentFailures += 1;
      else summary.transientFailures += 1;
    }
  }

  return summary;
}
