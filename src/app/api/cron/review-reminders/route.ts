import { runReviewReminderJob } from "@/lib/notifications/review-reminder-job";
import { webPushConfigured } from "@/lib/notifications/config";

function authorized(request: Request) {
  const expected = process.env.NOTIFICATION_CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === "Bearer " + expected;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!webPushConfigured()) {
    return Response.json({ error: "Web Push is not configured." }, { status: 503 });
  }

  const summary = await runReviewReminderJob(new Date());
  return Response.json({ ok: true, summary });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
