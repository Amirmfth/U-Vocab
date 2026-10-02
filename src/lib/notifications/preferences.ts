import "server-only";

import { db } from "@/lib/db";
import { isValidIanaTimeZone } from "./time";

export async function updateReviewNotificationPreference(input: {
  userId: string;
  userCourseId: string;
  enabled: boolean;
  reminderMinuteOfDay: number;
  minimumDueCount: number;
  timeZone: string;
}) {
  if (!Number.isInteger(input.reminderMinuteOfDay) || input.reminderMinuteOfDay < 0 || input.reminderMinuteOfDay > 1439) {
    throw new Error("Invalid reminder time.");
  }
  if (!Number.isInteger(input.minimumDueCount) || input.minimumDueCount < 1 || input.minimumDueCount > 9999) {
    throw new Error("Invalid minimum due count.");
  }
  if (!isValidIanaTimeZone(input.timeZone)) throw new Error("Invalid timezone.");

  const course = await db.userCourse.findFirst({
    where: { id: input.userCourseId, userId: input.userId },
    select: { id: true },
  });
  if (!course) throw new Error("Course not found.");

  return db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { timezone: input.timeZone },
    });
    return tx.reviewNotificationPreference.upsert({
      where: { userCourseId: input.userCourseId },
      create: {
        userId: input.userId,
        userCourseId: input.userCourseId,
        enabled: input.enabled,
        reminderMinuteOfDay: input.reminderMinuteOfDay,
        minimumDueCount: input.minimumDueCount,
        timezoneSource: "USER",
      },
      update: {
        enabled: input.enabled,
        reminderMinuteOfDay: input.reminderMinuteOfDay,
        minimumDueCount: input.minimumDueCount,
        timezoneSource: "USER",
      },
    });
  });
}
