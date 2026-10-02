import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { updateReviewNotificationPreference } from "@/lib/notifications/preferences";
import { sendProductEventForUser } from "@/lib/analytics/server";

export async function PUT(request: Request) {
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const body = (await request.json()) as {
    enabled?: unknown;
    reminderMinuteOfDay?: unknown;
    minimumDueCount?: unknown;
    timeZone?: unknown;
  };

  const enabled = body.enabled === true;
  const reminderMinuteOfDay = Number(body.reminderMinuteOfDay);
  const minimumDueCount = Number(body.minimumDueCount);
  const timeZone = typeof body.timeZone === "string" ? body.timeZone : "";

  const preference = await updateReviewNotificationPreference({
    userId: user.id,
    userCourseId: course.id,
    enabled,
    reminderMinuteOfDay,
    minimumDueCount,
    timeZone,
  });

  await sendProductEventForUser(
    user.id,
    enabled ? "notifications_enabled" : "notifications_disabled",
    { source: "settings" },
  );

  return Response.json({
    ok: true,
    enabled: preference.enabled,
  });
}
