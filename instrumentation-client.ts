import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { observabilityConfig } from "@/lib/observability/config";
import { scrubSentryEvent } from "@/lib/observability/privacy";

if (observabilityConfig.sentry.enabled) {
  Sentry.init({
    dsn: observabilityConfig.sentry.dsn,
    environment: observabilityConfig.environment,
    release: observabilityConfig.release,
    tracesSampleRate: observabilityConfig.sentry.tracesSampleRate,
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubSentryEvent(event);
    },
  });
}

if (observabilityConfig.posthog.enabled) {
  posthog.init(observabilityConfig.posthog.key, {
    api_host: observabilityConfig.posthog.host,
    defaults: "2026-05-30",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: !observabilityConfig.posthog.replayEnabled,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
