import { after } from "next/server";
import { PostHog } from "posthog-node";
import { analyticsAllowed, observabilityConfig } from "@/lib/observability/config";
import { getCurrentUser } from "@/lib/current-user";
import type { ProductEventMap, ProductEventName } from "./events";
import { validateProductEventProperties } from "./events";

export async function sendProductEventForUser<N extends ProductEventName>(
  userId: string,
  name: N,
  properties: ProductEventMap[N],
) {
  if (!analyticsAllowed()) return;
  if (!validateProductEventProperties(properties as Record<string, unknown>)) {
    return;
  }

  const client = new PostHog(observabilityConfig.posthog.key, {
    host: observabilityConfig.posthog.host,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    client.capture({
      distinctId: userId,
      event: name,
      properties,
    });
  } finally {
    await client.shutdown();
  }
}

export async function recordProductEvent<N extends ProductEventName>(
  name: N,
  properties: ProductEventMap[N],
) {
  if (!analyticsAllowed()) return;

  let userId: string;
  try {
    userId = (await getCurrentUser()).id;
  } catch {
    return;
  }

  try {
    after(() => sendProductEventForUser(userId, name, properties));
  } catch {
    void sendProductEventForUser(userId, name, properties);
  }
}
