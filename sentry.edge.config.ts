import * as Sentry from "@sentry/nextjs";
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
