import { getCurrentUser } from "@/lib/current-user";
import {
  disablePushSubscription,
  registerPushSubscription,
} from "@/lib/notifications/subscriptions";
import { sendProductEventForUser } from "@/lib/analytics/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = (await request.json()) as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
    deviceLabel?: unknown;
  };

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  const deviceLabel =
    typeof body.deviceLabel === "string" ? body.deviceLabel : null;

  const subscription = await registerPushSubscription({
    userId: user.id,
    endpoint,
    p256dh,
    auth,
    deviceLabel,
    userAgent: request.headers.get("user-agent"),
  });

  await sendProductEventForUser(user.id, "notifications_enabled", {
    source: "settings",
  });

  return Response.json({
    ok: true,
    subscriptionId: subscription.id,
  });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  const body = (await request.json()) as { endpoint?: unknown };
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  await disablePushSubscription({ userId: user.id, endpoint });
  return Response.json({ ok: true });
}
