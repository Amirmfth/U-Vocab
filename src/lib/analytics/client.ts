"use client";

import posthog from "posthog-js";
import { analyticsAllowed } from "@/lib/observability/config";
import type { ProductEventMap, ProductEventName } from "./events";
import { validateProductEventProperties } from "./events";

export function identifyAnalyticsUser(
  userId: string,
  properties: {
    uiLocale?: string;
    plan?: string;
    targetLanguage?: string;
  } = {},
) {
  if (!analyticsAllowed()) return;
  posthog.identify(userId, properties);
}

export function resetAnalyticsIdentity() {
  if (!analyticsAllowed()) return;
  posthog.reset();
}

export function captureProductEvent<N extends ProductEventName>(
  name: N,
  properties: ProductEventMap[N],
) {
  if (!analyticsAllowed()) return;
  if (!validateProductEventProperties(properties as Record<string, unknown>)) {
    return;
  }
  posthog.capture(name, properties);
}
