import { getCurrentUser } from "@/lib/current-user";
import { disablePushSubscription } from "@/lib/notifications/subscriptions";
import { sendProductEventForUser } from "@/lib/analytics/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = (await request.json()) as { endpoint?: unknown };
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (endpoint) {
    await disablePushSubscription({ userId: user.id, endpoint });
  }
  await sendProductEventForUser(user.id, "notifications_disabled", {
    source: "logout",
  });
  return Response.json({ ok: true });
}
